import { generateWithGroq } from "./groq.js";
import { generateWithGemini } from "./gemini.js";

export async function generateWithFallback(args: { system: string; prompt: string }) {
  const errors: string[] = [];
  if (process.env.GROQ_API_KEY) {
    try { return { text: await generateWithGroq(args.system, args.prompt), provider: "groq" }; } catch (e) { errors.push(`groq: ${e instanceof Error ? e.message : String(e)}`); }
  }
  if (process.env.GEMINI_API_KEY) {
    try { return { text: await generateWithGemini(args.system, args.prompt), provider: "gemini" }; } catch (e) { errors.push(`gemini: ${e instanceof Error ? e.message : String(e)}`); }
  }
  throw new Error(`No AI provider succeeded. ${errors.join(" | ") || "Configure GROQ_API_KEY or GEMINI_API_KEY."}`);
}
