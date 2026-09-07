import type { AgentDefinition } from "../core/agent.js";

export const researchAgent: AgentDefinition = {
  id: "research-agent",
  name: "Research Agent",
  description: "Produces structured research briefs from a supplied topic and requirements.",
  category: "research",
  fileExtension: "txt",
  requiredFields: [
    { name: "topic", label: "Research topic", type: "text" },
    { name: "scope", label: "Scope and key questions", type: "textarea" },
    { name: "format", label: "Output format", type: "text" },
    { name: "email", label: "Delivery email", type: "email" },
  ],
  getSystemPrompt: () => "You are a research assistant. Distinguish known facts from uncertainty, avoid fabricated citations, and structure findings so a reader can verify important claims.",
  buildPrompt: input => `Prepare a research brief. Topic: ${input.topic}\nScope: ${input.scope}\nRequested format: ${input.format}\nInclude an executive summary, key findings, limitations, and a concise source-verification section. Do not invent sources.`,
};
