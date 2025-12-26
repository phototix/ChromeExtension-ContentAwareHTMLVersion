// common/openai.js
// Minimal OpenAI chat client using Chat Completions API

export async function chatWithOpenAI({ apiKey, model, systemPrompt, userPrompt, contextText, historyMessages = [], summaryText }) {
  const messages = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }
  if (summaryText && summaryText.trim()) {
    messages.push({ role: "system", content: `Conversation summary so far (for context):\n${summaryText.trim()}` });
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

// Summarize a chat transcript into a compact context string.
export async function summarizeMessages({ apiKey, model, messagesToSummarize = [], maxWords = 250 }) {
  const system = `You are a helpful assistant that summarizes a chat transcript for future context reuse.\n` +
    `Produce a concise, factual summary capturing goals, constraints, key facts, important URLs/code, and decisions.\n` +
    `Prefer bullet points. Keep under ${maxWords} words. Do NOT include instructions or meta-commentary.`;

  // Build a plain transcript
  const lines = messagesToSummarize.map((m) => {
    const role = m.role || "user";
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    return `${role.toUpperCase()}: ${content}`;
  });
  const user = `Summarize the following transcript:\n\n${lines.join("\n\n")}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
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
