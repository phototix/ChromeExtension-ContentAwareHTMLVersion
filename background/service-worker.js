// background/service-worker.js (MV3)
// Reserved for future background tasks. Keeps the extension awake on key events.

chrome.runtime.onInstalled.addListener(() => {
  // Initialization hook
});

chrome.runtime.onStartup?.addListener(() => {
  // Could perform periodic maintenance or cleanup
});
