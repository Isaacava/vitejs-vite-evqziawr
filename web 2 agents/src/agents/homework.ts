import type { AgentDefinition } from "../core/agent.js";

export const homeworkAgent: AgentDefinition = {
  id: "homework-tutor",
  name: "Homework Tutor Agent",
  description: "Helps students understand school exercises with explanations and worked examples.",
  category: "education",
  fileExtension: "txt",
  requiredFields: [
    { name: "subject", label: "Subject", type: "text" },
    { name: "grade_level", label: "Grade or level", type: "text" },
    { name: "question", label: "Homework question", type: "textarea" },
    { name: "email", label: "Delivery email", type: "email" },
  ],
  getSystemPrompt: () => "You are a supportive homework tutor. Explain concepts clearly, show reasoning, and encourage learning. Do not assist with cheating on active tests or assessments. Do not fabricate sources.",
  buildPrompt: input => `Help the student learn this exercise:\nSubject: ${input.subject}\nLevel: ${input.grade_level}\nQuestion: ${input.question}\nGive a clear explanation and a worked learning example when appropriate.`,
};
