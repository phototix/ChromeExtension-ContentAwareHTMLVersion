// common/storage.js
// Helpers for working with localStorage snapshots and reserved keys

import { RESERVED_KEYS } from "./api.js";

export function getLocalSnapshot() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (RESERVED_KEYS.includes(key)) continue;
    try {
      data[key] = JSON.parse(localStorage.getItem(key));
    } catch {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

export function replaceLocalWithSnapshot(snapshotObj) {
  // Remove all non-reserved keys
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !RESERVED_KEYS.includes(key)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // Set from snapshot
  Object.entries(snapshotObj || {}).forEach(([k, v]) => {
    if (RESERVED_KEYS.includes(k)) return; // never set reserved
    try {
      localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    } catch {
      localStorage.setItem(k, String(v));
    }
  });
}

export function setReservedProfile({ email, apps }) {
  localStorage.setItem("masterauth_profile_v1", JSON.stringify({ email, apps }));
}

export function getReservedProfile() {
  try {
    return JSON.parse(localStorage.getItem("masterauth_profile_v1") || "null");
  } catch {
    return null;
  }
}

export function setLastSync(ts) {
  localStorage.setItem("masterauth_last_sync_v1", String(ts));
}

export function getLastSync() {
  return localStorage.getItem("masterauth_last_sync_v1");
}
