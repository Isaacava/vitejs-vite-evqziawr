import type { AgentDefinition } from "../core/agent.js";

export const cvAgent: AgentDefinition = {
  id: "cv-generator",
  name: "CV Generator Agent",
  description: "Creates a professional CV from structured candidate information.",
  category: "career_documents",
  fileExtension: "txt",
  requiredFields: [
    { name: "full_name", label: "Full name", type: "text" },
    { name: "target_role", label: "Target role", type: "text" },
    { name: "experience", label: "Experience", type: "textarea" },
    { name: "education", label: "Education", type: "textarea" },
    { name: "skills", label: "Skills", type: "textarea" },
    { name: "email", label: "Delivery email", type: "email" },
  ],
  getSystemPrompt: () => "You are a professional CV writer. Produce accurate, concise, ATS-friendly CV content. Never invent credentials, employers, dates, achievements, or contact details.",
  buildPrompt: input => `Create a polished CV using only these facts:\n${JSON.stringify(input, null, 2)}\nReturn plain text with clear headings.`,
};
