export async function generateWithGroq(system: string, prompt: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], temperature: 0.2 }),
  });
  if (!response.ok) throw new Error(`Groq HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json() as any;
  return String(data?.choices?.[0]?.message?.content || "").trim();
}
