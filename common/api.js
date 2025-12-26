// common/api.js
// MasterAuth API client for register/login and config sync

const MASTER_BASE = "https://api.brandon.my/v1/api";
export const RESERVED_KEYS = [
  "masterauth_profile_v1",
  "masterauth_last_sync_v1"
];

export function getAppIdFromUrl(urlString) {
  try {
    const u = new URL(urlString);
    const host = (u.hostname || "").trim();
    if (!host || host === "localhost") return "post-man-test";
    return host;
  } catch {
    return "post-man-test";
  }
}

export async function apiPost(path, body) {
  const res = await fetch(`${MASTER_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.status || `HTTP ${res.status}`);
  return json;
}

export async function apiGet(path, params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v && typeof v === "object") qs.set(k, JSON.stringify(v));
    else if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const url = `${MASTER_BASE}/${path}?${qs.toString()}`;
  const res = await fetch(url, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.status || `HTTP ${res.status}`);
  return json;
}

export async function register({ email, password, apps }) {
  return apiPost("auth/register", { email, password, apps });
}

export async function login({ email, password, apps }) {
  return apiPost("auth/login", { email, password, apps });
}

export async function getAppData({ email, apps, password_key }) {
  return apiGet("config/app", { email, apps, password_key });
}

export async function updateAppData({ email, apps, password_key, app_data }) {
  return apiPost("config/app", { email, apps, password_key, app_data });
}

export async function getUser({ email, apps }) {
  return apiGet("user", { email, apps });
}

export async function requestOtp({ email, apps }) {
  return apiPost("user", { email, apps });
}

export async function updatePassword({ email, apps, password_key, otp, new_password }) {
  return apiPost("user/password", { email, apps, password_key, otp, new_password });
}

export function setPasswordKeyCookie(password_key) {
  // Store cookie on api domain for ~30 days
  const expirationDate = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  return new Promise((resolve, reject) => {
    chrome.cookies.set(
      {
        url: "https://api.brandon.my/",
        name: "masterauth_password_key",
        value: String(password_key),
        expirationDate,
        sameSite: "lax"
      },
      (cookie) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(cookie);
      }
    );
  });
}

export function getPasswordKeyCookie() {
  return new Promise((resolve) => {
    chrome.cookies.get(
      { url: "https://api.brandon.my/", name: "masterauth_password_key" },
      (cookie) => resolve(cookie ? cookie.value : null)
    );
  });
}

export function removePasswordKeyCookie() {
  return new Promise((resolve) => {
    chrome.cookies.remove(
      { url: "https://api.brandon.my/", name: "masterauth_password_key" },
      () => resolve(true)
    );
  });
}
