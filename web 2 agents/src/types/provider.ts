export type AgentInput = Record<string, unknown>;
export type AgentResult = { text: string; provider: string };
export type Erc8183Request = {
  job_id?: string | number;
  chain_job_id: string | number;
  agent_id?: string;
  input?: AgentInput;
  purpose?: string;
  duration_seconds?: number;
  capital_requested?: number;
  funded?: boolean;
};
