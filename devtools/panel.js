import { chatWithOpenAI } from "../common/openai.js";

const chatEl = document.getElementById("chat");
const userInput = document.getElementById("userInput");
const btnSend = document.getElementById("btnSend");
const btnLoadHtml = document.getElementById("btnLoadHtml");
const btnClearHistory = document.getElementById("btnClearHistory");
const htmlInfo = document.getElementById("htmlInfo");

let pageHtml = "";
let history = [];
let hostKey = "unknown";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(u) {
  try {
    const url = new URL(u, location.href);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    return "#";
  } catch {
    return "#";
  }
}

function transformInline(s) {
  // s is already escaped
  // links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => {
    const safe = sanitizeUrl(href);
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  // inline code `code`
  s = s.replace(/`([^`]+)`/g, (m, code) => `<code>${code}</code>`);
  // bold **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, (m, t) => `<strong>${t}</strong>`);
  // italics *text* or _text_
  s = s.replace(/\*([^*]+)\*/g, (m, t) => `<em>${t}</em>`);
  s = s.replace(/_([^_]+)_/g, (m, t) => `<em>${t}</em>`);
  return s;
}

function mdToHtml(md) {
  if (!md) return "";
  const parts = [];
  const fence = /```([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = fence.exec(md)) !== null) {
    if (m.index > last) parts.push({ type: "text", text: md.slice(last, m.index) });
    let code = m[1] || "";
    // strip possible language hint on first line (e.g., "javascript\n")
    code = code.replace(/^[a-z][\w-]*\r?\n/i, "");
    parts.push({ type: "code", code });
    last = fence.lastIndex;
  }
  if (last < md.length) parts.push({ type: "text", text: md.slice(last) });

  let html = "";
  for (const p of parts) {
    if (p.type === "code") {
      html += `<pre><code>${escapeHtml(p.code)}</code></pre>`;
      continue;
    }
    const lines = p.text.split(/\r?\n/);
    let inList = false;
    for (let raw of lines) {
      const line = raw.replace(/\s+$/, "");
      if (!line.trim()) {
        if (inList) { html += "</ul>"; inList = false; }
        continue;
      }
      const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
      if (h) {
        if (inList) { html += "</ul>"; inList = false; }
        const level = h[1].length;
        const content = transformInline(escapeHtml(h[2]));
        html += `<h${level}>${content}</h${level}>`;
        continue;
      }
      const li = line.match(/^\s*[-*]\s+(.*)$/);
      if (li) {
        if (!inList) { html += "<ul>"; inList = true; }
        const content = transformInline(escapeHtml(li[1]));
        html += `<li>${content}</li>`;
        continue;
      }
      if (inList) { html += "</ul>"; inList = false; }
      const content = transformInline(escapeHtml(line));
      html += `<p>${content}</p>`;
    }
    if (inList) { html += "</ul>"; }
  }
  return html;
}

function appendMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  if (role === "assistant") {
    div.innerHTML = mdToHtml(text);
  } else {
    div.textContent = text;
  }
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function loadSettings() {
  return {
    apiKey: localStorage.getItem("oa_api_key") || "",
    model: localStorage.getItem("oa_model") || "gpt-4o-mini",
    systemPrompt: localStorage.getItem("oa_system_prompt") || ""
  };
}

function computeHistoryKey() {
  return `chat_history_${hostKey}`;
}

function saveHistory() {
  localStorage.setItem(computeHistoryKey(), JSON.stringify(history));
}

function loadHistory() {
  try {
    history = JSON.parse(localStorage.getItem(computeHistoryKey()) || "[]");
  } catch {
    history = [];
  }
  history.forEach((m) => appendMsg(m.role === "user" ? "user" : "assistant", m.content));
}

function clearHistoryUI() {
  chatEl.innerHTML = "";
}

async function loadPageHtml() {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(
      "document.documentElement.outerHTML",
      function(result, exc) {
        if (exc) resolve("");
        else resolve(result || "");
      }
    );
  });
}

async function sendMessage() {
  const settings = loadSettings();
  if (!settings.apiKey) {
    appendMsg("assistant", "Missing OpenAI API key in popup settings.");
    return;
  }
  const prompt = userInput.value.trim();
  if (!prompt) return;
  userInput.value = "";

  appendMsg("user", prompt);
  history.push({ role: "user", content: prompt });
  saveHistory();

  try {
    const answer = await chatWithOpenAI({
      apiKey: settings.apiKey,
      model: settings.model,
      systemPrompt: settings.systemPrompt,
      userPrompt: prompt,
      contextText: pageHtml,
      historyMessages: history.map((m) => ({ role: m.role, content: m.content }))
    });
    appendMsg("assistant", answer);
    history.push({ role: "assistant", content: answer });
    saveHistory();
  } catch (e) {
    const msg = e?.message || String(e);
    appendMsg("assistant", `Error: ${msg}`);
  }
}

async function init() {
  // derive host key for per-site history
  chrome.devtools.inspectedWindow.eval("location.host", (res, exc) => {
    hostKey = (res || "unknown").trim() || "unknown";
    loadHistory();
  });

  btnLoadHtml.addEventListener("click", async () => {
    pageHtml = await loadPageHtml();
    htmlInfo.textContent = pageHtml ? `HTML size: ${pageHtml.length.toLocaleString()} chars` : "No HTML captured";
  });

  btnSend.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      sendMessage();
    }
  });

  btnClearHistory.addEventListener("click", () => {
    history = [];
    saveHistory();
    clearHistoryUI();
  });
}

init();
