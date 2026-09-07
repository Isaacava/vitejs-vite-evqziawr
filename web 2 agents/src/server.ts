import "dotenv/config";
import express from "express";
import cors from "cors";
import { agents, agentMap } from "./agents/index.js";
import { validateInput, buildDeliverableFilename } from "./core/agent.js";
import { deliverableHash, erc8183Metadata, getJob, submitJob } from "./core/erc8183.js";
import { generateWithFallback } from "./providers/index.js";
import { sendDeliverableEmail } from "./email/mailer.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const port = Number(process.env.PORT || 8788);
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

function numericJobId(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? text : null;
}

function selectedAgent(body: any) {
  return agentMap.get(String(body?.agent_id || ""));
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "web2-ai-agents", erc8183: erc8183Metadata(), agents: agents.map(a => a.id) }));

app.get("/agent.json", (_req, res) => res.json({
  spec: "agent-provider/v1",
  name: process.env.AGENT_NAME || "AgentMarket Web2 AI Agents",
  version: process.env.AGENT_VERSION || "1.0.0",
  protocols: ["http", "erc-8183", "agentmarket"],
  capabilities: agents.map(agent => ({ id: agent.id, name: agent.name, description: agent.description, category: agent.category })),
  endpoints: {
    health: { url: `${baseUrl}/health`, method: "GET" },
    requirements: { url: `${baseUrl}/requirements`, method: "POST" },
    quote: { url: `${baseUrl}/quote`, method: "POST" },
    decision: { url: `${baseUrl}/decision`, method: "POST" },
    execution_capabilities: { url: `${baseUrl}/execution-capabilities`, method: "GET" },
    execute: { url: `${baseUrl}/execute`, method: "POST" },
    result: { url: `${baseUrl}/result`, method: "POST" },
  },
  hiring: { model: "AgentMarket-managed", funding: "ERC-8183", payment_unit: "contract-defined-erc20" },
  execution: { protocol: "ERC-8183", role: "provider", delivery: "email-before-submit", job_identifier: "chain_job_id" },
  erc8183: erc8183Metadata(),
}));

app.post("/requirements", (req, res) => {
  const agent = selectedAgent(req.body);
  if (!agent) return res.status(404).json({ error: "Unknown agent" });
  return res.json({ ok: true, agent_id: agent.id, name: agent.name, requirements: agent.requiredFields });
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
  return res.json({ ok: true, agent_id: agent.id, price: { amount: 1, unit: "contract-defined-erc20", negotiable: true }, protocol: "erc-8183" });
});

app.post("/decision", (req, res) => {
  const agent = selectedAgent(req.body);
  if (!agent) return res.status(404).json({ error: "Unknown agent" });
  const validation = validateInput(agent, req.body?.input || {});
  return res.json({ ok: validation.ok, agent_id: agent.id, missing: validation.missing, accepted: validation.ok, protocol: "erc-8183", note: validation.ok ? "Ready for ERC-8183 funding and execution" : "Collect required information before funding" });
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
    const email = String(input.email);
    const filename = buildDeliverableFilename(agent);
    await sendDeliverableEmail({ to: email, subject: `${agent.name} deliverable`, filename, content: result.text, jobId });

    const deliverable = deliverableHash(result.text);
    const submission = await submitJob(jobId, deliverable);
    return res.json({ ok: true, agent_id: agent.id, status: "submitted", protocol: "erc-8183", provider: result.provider, deliverable: { filename, emailed_to: email, hash: deliverable }, submission });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Execution failed" });
  }
});

app.post("/result", (req, res) => res.json({ ok: true, protocol: "erc-8183", status: "submitted", chain_job_id: numericJobId(req.body?.chain_job_id || req.body?.job_id) }));

app.listen(port, () => console.log(`Web2 ERC-8183 AI Agents listening on ${port}`));
