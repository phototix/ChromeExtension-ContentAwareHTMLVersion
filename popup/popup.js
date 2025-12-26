import { register, login, getAppData, updateAppData, setPasswordKeyCookie, getPasswordKeyCookie, removePasswordKeyCookie, getAppIdFromUrl } from "../common/api.js";
import { getLocalSnapshot, replaceLocalWithSnapshot, setReservedProfile, getReservedProfile, setLastSync, getLastSync } from "../common/storage.js";

const el = (id) => document.getElementById(id);

function loadSaved() {
  el("apiKey").value = localStorage.getItem("oa_api_key") || "";
  el("model").value = localStorage.getItem("oa_model") || "gpt-4o-mini";
  el("systemPrompt").value = localStorage.getItem("oa_system_prompt") || "";

  const profile = getReservedProfile();
  if (profile) {
    el("maEmail").value = profile.email || "";
  }
}

function saveOpenAI() {
  localStorage.setItem("oa_api_key", el("apiKey").value.trim());
  localStorage.setItem("oa_model", el("model").value);
  localStorage.setItem("oa_system_prompt", el("systemPrompt").value.trim());
  showStatus("Saved OpenAI settings.");
}

// async function currentTabUrl() {
//   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   return tab?.url || "";
// }

async function resolveAppId() {
  const url = "crhome-extension-tabHTMLHelperAI";
}

function showStatus(msg, isError=false) {
  const s = el("maStatus");
  s.textContent = msg;
  s.classList.toggle("error", !!isError);
}

async function onRegister() {
  try {
    showStatus("Registering...");
    const email = el("maEmail").value.trim();
    const password = el("maPassword").value;
    const apps = await resolveAppId();
    const res = await register({ email, password, apps });
    if (res?.password_key) await setPasswordKeyCookie(res.password_key);
    setReservedProfile({ email, apps });
    showStatus(`Registered (${res.status || "ok"}).`);
  } catch (e) {
    showStatus(String(e.message || e), true);
  }
}

async function onLogin() {
  try {
    showStatus("Logging in...");
    const email = el("maEmail").value.trim();
    const password = el("maPassword").value;
    const apps = await resolveAppId();
    const res = await login({ email, password, apps });
    if (res?.password_key) await setPasswordKeyCookie(res.password_key);
    setReservedProfile({ email, apps });
    showStatus("Login success. Syncing...");
    await autoSync({ email, apps, password_key: res.password_key });
  } catch (e) {
    showStatus(String(e.message || e), true);
  }
}

async function onLogout() {
  await removePasswordKeyCookie();
  showStatus("Logged out.");
}

async function onDownload() {
  try {
    showStatus("Downloading...");
    const profile = getReservedProfile();
    const cookiePk = await getPasswordKeyCookie();
    if (!profile?.email || !profile?.apps || !cookiePk) throw new Error("Not logged in");
    const res = await getAppData({ email: profile.email, apps: profile.apps, password_key: cookiePk });
    if (res?.status === "data-found") {
      const d = typeof res.data === "string" ? JSON.parse(res.data) : (res.data || {});
      replaceLocalWithSnapshot(d);
      setLastSync(res.last_sync || new Date().toISOString());
      showStatus("Downloaded and applied.");
    } else {
      showStatus(res?.status || "No data.");
    }
  } catch (e) {
    showStatus(String(e.message || e), true);
  }
}

async function onUpload() {
  try {
    showStatus("Uploading...");
    const profile = getReservedProfile();
    const cookiePk = await getPasswordKeyCookie();
    if (!profile?.email || !profile?.apps || !cookiePk) throw new Error("Not logged in");
    const payload = getLocalSnapshot();
    const res = await updateAppData({ email: profile.email, apps: profile.apps, password_key: cookiePk, app_data: payload });
    if (res?.status === "data-updated") {
      const now = new Date().toISOString();
      setLastSync(now);
      showStatus("Uploaded.");
    } else {
      showStatus(res?.status || "Upload failed", true);
    }
  } catch (e) {
    showStatus(String(e.message || e), true);
  }
}

async function autoSync({ email, apps, password_key }) {
  try {
    const res = await getAppData({ email, apps, password_key });
    const localTs = getLastSync();
    const serverTs = res?.last_sync;
    const serverEmpty = serverTs === "new-data" || !res?.data || (typeof res.data === "object" && Object.keys(res.data).length === 0);

    if (!serverEmpty) {
      // If server has data and is newer than local, pull
      if (!localTs || (serverTs && serverTs > localTs)) {
        const d = typeof res.data === "string" ? JSON.parse(res.data) : (res.data || {});
        replaceLocalWithSnapshot(d);
        setLastSync(serverTs || new Date().toISOString());
        showStatus("Synced from server.");
        return;
      }
    }
    // Otherwise push local
    const payload = getLocalSnapshot();
    const upd = await updateAppData({ email, apps, password_key, app_data: payload });
    if (upd?.status === "data-updated") {
      const now = new Date().toISOString();
      setLastSync(now);
      showStatus("Synced to server.");
    }
  } catch (e) {
    showStatus(String(e.message || e), true);
  }
}

// Wire events
window.addEventListener("DOMContentLoaded", async () => {
  loadSaved();
  el("saveOpenAI").addEventListener("click", saveOpenAI);
  el("btnRegister").addEventListener("click", onRegister);
  el("btnLogin").addEventListener("click", onLogin);
  el("btnLogout").addEventListener("click", onLogout);
  el("btnDownload").addEventListener("click", onDownload);
  el("btnUpload").addEventListener("click", onUpload);
});
