// common/openai.js
// Minimal chat client using OpenAI-compatible Chat Completions APIs.

export const PROVIDER_CONFIG = {
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini"
  },
  deepseek: {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    defaultModel: "deepseek-chat"
  }
};

export function resolveProviderConfig(provider = "openai") {
  return PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.openai;
}

async function callChatCompletion({ provider = "openai", apiKey, model, systemPrompt, userPrompt, contextText, historyMessages = [], summaryText, isSummary = false }) {
  const config = resolveProviderConfig(provider);
  const messages = [];

  if (systemPrompt && systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }

  if (isSummary) {
    const summary = `You are a helpful assistant that summarizes a chat transcript for future context reuse.\n` +
      `Produce a concise, factual summary capturing goals, constraints, key facts, important URLs/code, and decisions.\n` +
      `Prefer bullet points. Keep under ${Math.max(1, Number(summaryText) || 250)} words. Do NOT include instructions or meta-commentary.`;
    messages.push({ role: "system", content: summary });
  } else if (summaryText && summaryText.trim()) {
    messages.push({ role: "system", content: `Conversation summary so far (for context):\n${summaryText.trim()}` });
  }

  if (isSummary) {
    const lines = (Array.isArray(historyMessages) ? historyMessages : []).map((m) => {
      const role = m.role || "user";
      const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      return `${role.toUpperCase()}: ${content}`;
    });
    const user = `Summarize the following transcript:\n\n${lines.join("\n\n")}`;
    messages.push({ role: "user", content: user });
  } else {
    const trimmedHistory = historyMessages.slice(-8);
    trimmedHistory.forEach((m) => messages.push(m));

    const contextPrefix = "[PAGE HTML CONTEXT]\n";
    const maxContextChars = 120_000;
    const ctx = (contextText || "").slice(0, maxContextChars);
    const composite = `${contextPrefix}${ctx}\n\n[USER REQUEST]\n${userPrompt || ""}`;
    messages.push({ role: "user", content: composite });
  }

  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || config.defaultModel,
      temperature: 0.2,
      messages
    })
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `${config.name} error HTTP ${res.status}`;
    throw new Error(msg);
  }
  const content = json?.choices?.[0]?.message?.content || "";
  return content;
}

export async function chatWithOpenAI({ provider = "openai", apiKey, model, systemPrompt, userPrompt, contextText, historyMessages = [], summaryText }) {
  return callChatCompletion({ provider, apiKey, model, systemPrompt, userPrompt, contextText, historyMessages, summaryText });
}

export async function summarizeMessages({ provider = "openai", apiKey, model, messagesToSummarize = [], maxWords = 250 }) {
  return callChatCompletion({
    provider,
    apiKey,
    model,
    historyMessages: messagesToSummarize,
    isSummary: true,
    summaryText: String(maxWords)
  });
}

export async function chatWithDeepSeek(args) {
  return chatWithOpenAI({ ...args, provider: "deepseek" });
}
