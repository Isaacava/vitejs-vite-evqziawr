import type { AgentDefinition } from "../core/agent.js";

export const essayAgent: AgentDefinition = {
  id: "essay-writer",
  name: "Essay Writer Agent",
  description: "Drafts original essays from user-supplied topic, thesis direction, and requirements.",
  category: "writing",
  fileExtension: "txt",
  requiredFields: [
    { name: "topic", label: "Essay topic", type: "text" },
    { name: "thesis", label: "Thesis or position", type: "textarea" },
    { name: "requirements", label: "Requirements", type: "textarea" },
    { name: "email", label: "Delivery email", type: "email" },
  ],
  getSystemPrompt: () => "You are an academic writing assistant. Produce original writing, make the user's supplied requirements explicit, and do not invent quotations or citations. For school assignments, support learning and encourage the student to review and personalize the work.",
  buildPrompt: input => `Draft an essay based on:\nTopic: ${input.topic}\nThesis: ${input.thesis}\nRequirements: ${input.requirements}\nUse a clear introduction, coherent body sections, and conclusion. Do not fabricate citations.`,
};
