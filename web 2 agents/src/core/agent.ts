import type { AgentInput } from "../types/provider.js";

export type AgentDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  fileExtension: string;
  requiredFields: Array<{ name: string; label: string; type: string; description?: string; required?: boolean }>;
  getSystemPrompt: () => string;
  buildPrompt: (input: AgentInput) => string;
};

export function validateInput(agent: AgentDefinition, input: AgentInput) {
  const missing = agent.requiredFields.filter(field => field.required !== false).filter(field => input[field.name] === undefined || input[field.name] === null || String(input[field.name]).trim() === "").map(field => field.name);
  return { ok: missing.length === 0, missing };
}

export function buildDeliverableFilename(agent: AgentDefinition) {
  return `${agent.id}-${new Date().toISOString().replace(/[:.]/g, "-")}.${agent.fileExtension}`;
}
