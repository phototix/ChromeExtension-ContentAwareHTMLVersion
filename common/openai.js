// common/openai.js
// Minimal OpenAI chat client using Chat Completions API

export async function chatWithOpenAI({ apiKey, model, systemPrompt, userPrompt, contextText, historyMessages = [] }) {
  const messages = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }

  // Append limited history (last 8 turns)
  const trimmedHistory = historyMessages.slice(-8);
  trimmedHistory.forEach((m) => messages.push(m));

  // Attach context + request
  const contextPrefix = "[PAGE HTML CONTEXT]\n";
  const maxContextChars = 120_000; // keep request size in check
  const ctx = (contextText || "").slice(0, maxContextChars);
  const composite = `${contextPrefix}${ctx}\n\n[USER REQUEST]\n${userPrompt || ""}`;
  messages.push({ role: "user", content: composite });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      temperature: 0.2,
      messages
    })
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `OpenAI error HTTP ${res.status}`;
    throw new Error(msg);
  }
  const content = json?.choices?.[0]?.message?.content || "";
  return content;
}
