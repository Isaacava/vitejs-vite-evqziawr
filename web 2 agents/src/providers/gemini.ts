export async function generateWithGemini(system: string, prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}: ${await response.text()}`);
  const data = await response.json() as any;
  const text = String(data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "").trim();
  if (!text) throw new Error("Gemini returned an empty completion");
  return text;
}
