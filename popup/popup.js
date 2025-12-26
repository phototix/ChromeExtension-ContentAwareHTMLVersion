import { register, login, getAppData, updateAppData, setPasswordKeyCookie, getPasswordKeyCookie, removePasswordKeyCookie, getAppIdFromUrl } from "../common/api.js";
import { getLocalSnapshot, replaceLocalWithSnapshot, setReservedProfile, getReservedProfile, setLastSync, getLastSync, setPasswordKeySession, getPasswordKeySession, clearPasswordKeySession } from "../common/storage.js";

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

async function resolveAppId() {
  // Fixed app id for this Chrome extension
  return "chrome-extension-tabHTMLHelperAI";
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
    if (res?.status !== "success-registered") {
      showStatus(res?.status || "Registration failed", true);
      return;
    }
    if (res?.password_key) {
      await setPasswordKeyCookie(res.password_key);
      setPasswordKeySession(res.password_key);
    }
    setReservedProfile({ email, apps });
    showStatus("Registered.");
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
    if (res?.status !== "success-login" || !res?.password_key) {
      showStatus(res?.status || "Login failed", true);
      return;
    }
    if (res?.password_key) {
      await setPasswordKeyCookie(res.password_key);
      setPasswordKeySession(res.password_key);
    }
    setReservedProfile({ email, apps });
    showStatus("Login success.");
  } catch (e) {
    showStatus(String(e.message || e), true);
  }
}

async function onLogout() {
  await removePasswordKeyCookie();
  clearPasswordKeySession();
  showStatus("Logged out.");
}

async function onDownload() {
  try {
    showStatus("Downloading...");
    const profile = getReservedProfile();
    const cookiePk = await getPasswordKeyCookie();
    const sessionPk = getPasswordKeySession();
    const password_key = cookiePk || sessionPk;
    const apps = profile?.apps || (await resolveAppId());
    if (!profile?.email || !apps || !password_key) throw new Error("Not logged in");
    if (!profile?.apps && apps) setReservedProfile({ email: profile.email, apps });
    const res = await getAppData({ email: profile.email, apps, password_key });
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
    const sessionPk = getPasswordKeySession();
    const password_key = cookiePk || sessionPk;
    const apps = profile?.apps || (await resolveAppId());
    if (!profile?.email || !apps || !password_key) throw new Error("Not logged in");
    const payload = getLocalSnapshot();
    if (!profile?.apps && apps) setReservedProfile({ email: profile.email, apps });
    const res = await updateAppData({ email: profile.email, apps, password_key, app_data: payload });
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
