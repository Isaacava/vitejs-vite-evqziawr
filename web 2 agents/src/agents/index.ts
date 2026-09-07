import { cvAgent } from "./cv.js";
import { essayAgent } from "./essay.js";
import { homeworkAgent } from "./homework.js";
import { researchAgent } from "./research.js";
import type { AgentDefinition } from "../core/agent.js";

export const agents: AgentDefinition[] = [cvAgent, homeworkAgent, researchAgent, essayAgent];
export const agentMap = new Map(agents.map(agent => [agent.id, agent]));
