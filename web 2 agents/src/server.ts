import "dotenv/config";
import express from "express";
import cors from "cors";
import { agents, agentMap } from "./agents/index.js";
import { validateInput, buildDeliverableFilename } from "./core/agent.js";
import { deliverableHash, erc8183Metadata, getJob, submitJob } from "./core/erc8183.js";
import { ensureAgent8004Registration, erc8004Metadata, erc8004RegistrationDocument } from "./core/erc8004.js";
import { generateWithFallback } from "./providers/index.js";
import { sendDeliverableEmail } from "./email/mailer.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const port = Number(process.env.PORT || 8788);
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");
const erc8004Ids = new Map<string, string>();
const ERC8183_QUOTE_AMOUNT_RAW = "1000000000000000000";

function numericJobId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? text : null;
}

function selectedAgent(body: any) {
  return agentMap.get(String(body?.agent_id || ""));
}

function publicAgentUri(agentId: string) {
  return `${baseUrl}/erc8004/${encodeURIComponent(agentId)}.json`;
}

function capabilitySchema(agent: typeof agents[number]) {
  return {
    version: 1,
    inputs: agent.requiredFields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type,
      required: true,
    })),
  };
}

function operationInputSchema(agent: typeof agents[number]) {
  const properties = Object.fromEntries(agent.requiredFields.map(field => [field.name, {
    type: "string",
    title: field.label,
    ...(field.type === "email" ? { format: "email" } : {}),
  }]));
  return {
    type: "object",
    required: agent.requiredFields.map(field => field.name),
    properties,
  };
}

function registrationServices(agent: typeof agents[number]) {
  const inputSchema = operationInputSchema(agent);
  const schema = capabilitySchema(agent);
  return [
    { name: "web", endpoint: `${baseUrl}/agent.json` },
    { name: "agentmarket", endpoint: baseUrl },
    { name: "erc8183", endpoint: `${baseUrl}/execution-capabilities` },
    { name: "requirements", endpoint: `${baseUrl}/requirements`, version: "1" },
    { name: "quote", endpoint: `${baseUrl}/quote`, version: "1", metadata: { input_schema: inputSchema, capability_schema: schema } },
    { name: "execute", endpoint: `${baseUrl}/execute`, version: "1", metadata: { input_schema: inputSchema, capability_schema: schema } },
    { name: "agent", endpoint: publicAgentUri(agent.id) },
  ];
}

async function autoRegisterERC8004() {
  if (process.env.AUTO_REGISTER_ERC8004 === "false") return;
  if (!/^https?:\/\//i.test(baseUrl) || baseUrl.includes("localhost")) {
    console.warn("ERC-8004 auto-registration skipped: BASE_URL must be a public HTTP(S) URL");
    return;
  }
  for (const agent of agents) {
    try {
      const registration = await ensureAgent8004Registration(publicAgentUri(agent.id));
      erc8004Ids.set(agent.id, registration.agent_id);
      console.log(`ERC8004_REGISTERED agent=${agent.id} agent_id=${registration.agent_id} registry=${registration.agent_registry}`);
    } catch (error) {
      console.error(`ERC8004_REGISTRATION_FAILED agent=${agent.id}`, error);
    }
  }
}

app.get("/", (_req, res) => res.json({
  ok: true,
  service: "web2-ai-agents",
  manifest: `${baseUrl}/agent.json`,
  protocols: ["erc-8183", "erc-8004", "agentmarket"],
}));

app.get("/health", (_req, res) => res.json({ ok: true, service: "web2-ai-agents", erc8183: erc8183Metadata(), erc8004: erc8004Metadata(), agents: agents.map(a => ({ id: a.id, erc8004_agent_id: erc8004Ids.get(a.id) || null })) }));

app.get("/agent.json", (_req, res) => res.json({
  spec: "agent-provider/v1",
  name: process.env.AGENT_NAME || "AgentMarket Web2 AI Agents",
  version: process.env.AGENT_VERSION || "1.0.0",
  protocols: ["http", "erc-8183", "erc-8004", "agentmarket"],
  capabilities: agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    category: agent.category,
    erc8004_agent_id: erc8004Ids.get(agent.id) || null,
    capability_schema: capabilitySchema(agent),
    input_schema: operationInputSchema(agent),
  })),
  endpoints: {
    health: { url: `${baseUrl}/health`, method: "GET" },
    requirements: { url: `${baseUrl}/requirements`, method: "POST" },
    quote: {
      url: `${baseUrl}/quote`,
      method: "POST",
      input_schema_by_agent: Object.fromEntries(agents.map(agent => [agent.id, operationInputSchema(agent)])),
    },
    decision: {
      url: `${baseUrl}/decision`,
      method: "POST",
      input_schema_by_agent: Object.fromEntries(agents.map(agent => [agent.id, operationInputSchema(agent)])),
    },
    execution_capabilities: { url: `${baseUrl}/execution-capabilities`, method: "GET" },
    execute: {
      url: `${baseUrl}/execute`,
      method: "POST",
      input_schema_by_agent: Object.fromEntries(agents.map(agent => [agent.id, operationInputSchema(agent)])),
    },
    result: { url: `${baseUrl}/result`, method: "POST" },
  },
  hiring: {
    model: "AgentMarket-managed",
    funding: "ERC-8183",
    payment_unit: "contract-defined-erc20",
    input_schema_source: "capability_schema",
  },
  execution: { protocol: "ERC-8183", role: "provider", delivery: "email-before-submit", job_identifier: "chain_job_id" },
  identity: { ...erc8004Metadata(), registrations: agents.map(agent => ({ agent_id: erc8004Ids.get(agent.id) || null, agent_registry: erc8004Metadata().registry_format, agent_uri: publicAgentUri(agent.id) })) },
  erc8183: erc8183Metadata(),
}));

app.get("/erc8004/:agentId.json", (req, res) => {
  const agent = agentMap.get(String(req.params.agentId || ""));
  if (!agent) return res.status(404).json({ error: "Unknown agent" });
  return res.json(erc8004RegistrationDocument({
    name: agent.name,
    description: agent.description,
    services: registrationServices(agent),
    agentId: erc8004Ids.get(agent.id) || null,
    capabilities: [{
      id: agent.id,
      name: agent.name,
      description: agent.description,
      category: agent.category,
      capability_schema: capabilitySchema(agent),
      input_schema: operationInputSchema(agent),
    }],
  }));
});

app.post("/requirements", (req, res) => {
  const agent = selectedAgent(req.body);
  if (!agent) return res.status(404).json({ error: "Unknown agent" });
  return res.json({ ok: true, agent_id: agent.id, name: agent.name, version: 1, capability_schema: capabilitySchema(agent), requirements: agent.requiredFields });
});

app.get("/execution-capabilities", async (req, res) => {
  const jobId = numericJobId(req.query.job_id || req.query.chain_job_id);
  if (!jobId) return res.status(400).json({ error: "job_id must be the numeric ERC-8183 chain job ID" });
  try {
    const job = await getJob(jobId);
    return res.json({ ok: true, ...erc8183Metadata(), chain_job_id: Number(job.id), provider: job.provider, evaluator: job.evaluator, status: job.status, authorization_request: { chain_job_id: Number(job.id), duration_seconds: 86400 }, execution: "erc8183-provider" });
  } catch (error) {
    return res.status(404).json({ error: error instanceof Error ? error.message : "ERC-8183 job lookup failed" });
  }
});

app.post("/quote", (req, res) => {
  const agent = selectedAgent(req.body);
  if (!agent) return res.status(404).json({ error: "Unknown agent" });
  const validation = validateInput(agent, req.body?.input || {});
  if (!validation.ok) return res.status(422).json({ error: "Missing required information", missing: validation.missing });
  return res.json({ ok: true, agent_id: agent.id, price: { amount: ERC8183_QUOTE_AMOUNT_RAW, unit: "U", decimals: 18, amount_display: "1 U", negotiable: true }, protocol: "erc-8183", capability_schema: capabilitySchema(agent), input_schema: operationInputSchema(agent) });
});

app.post("/decision", (req, res) => {
  const agent = selectedAgent(req.body);
  if (!agent) return res.status(404).json({ error: "Unknown agent" });
  const validation = validateInput(agent, req.body?.input || {});
  return res.json({ ok: validation.ok, agent_id: agent.id, missing: validation.missing, accepted: validation.ok, protocol: "erc-8183", capability_schema: capabilitySchema(agent), input_schema: operationInputSchema(agent), note: validation.ok ? "Ready for ERC-8183 funding and execution" : "Collect required information before funding" });
});

app.post("/execute", async (req, res) => {
  try {
    const agent = selectedAgent(req.body);
    if (!agent) return res.status(404).json({ error: "Unknown agent" });
    const jobId = numericJobId(req.body?.chain_job_id || req.body?.job_id);
    if (!jobId) return res.status(400).json({ error: "chain_job_id must be the numeric ERC-8183 job ID" });
    const input = (req.body?.input || {}) as Record<string, unknown>;
    const validation = validateInput(agent, input);
    if (!validation.ok) return res.status(422).json({ error: "Missing required information", missing: validation.missing });

    const job = await getJob(jobId);
    if (job.status !== 1) return res.status(409).json({ error: `ERC-8183 job must be Funded before execution; current status=${job.status}` });

    const result = await generateWithFallback({ system: agent.getSystemPrompt(), prompt: agent.buildPrompt(input) });
    if (!result.text.trim()) return res.status(502).json({ error: "AI provider returned an empty deliverable" });
    const email = String(input.email);
    const filename = buildDeliverableFilename(agent);
    await sendDeliverableEmail({ to: email, subject: `${agent.name} deliverable`, filename, content: result.text, jobId });

    const deliverable = deliverableHash(result.text);
    const submission = await submitJob(jobId, deliverable);
    return res.json({ ok: true, agent_id: agent.id, erc8004_agent_id: erc8004Ids.get(agent.id) || null, status: "submitted", protocol: "erc-8183", provider: result.provider, deliverable: { filename, emailed_to: email, hash: deliverable }, submission });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Execution failed" });
  }
});

app.post("/result", (req, res) => res.json({ ok: true, protocol: "erc-8183", status: "submitted", chain_job_id: numericJobId(req.body?.chain_job_id || req.body?.job_id) }));

app.listen(port, () => {
  console.log(`Web2 ERC-8183/ERC-8004 AI Agents listening on ${port}`);
  void autoRegisterERC8004();
});
