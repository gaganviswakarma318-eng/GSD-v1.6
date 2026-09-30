import { statusPanel, progressEl, internetStatusEl } from "./dom.js";

function updateStatusVisibility() {
  if (!statusPanel) return;

  const hasProgress = progressEl && progressEl.textContent.trim();
  const hasStatus = internetStatusEl && internetStatusEl.textContent.trim();
  const hasWidget = statusPanel.querySelector(".dlp-widget");

  statusPanel.style.display =
    hasProgress || hasStatus || hasWidget ? "flex" : "none";
}

function hideProgress(message) {
  if (!progressEl) return;
  if (progressEl.innerText !== message) return;
  progressEl.innerText = "";
  updateStatusVisibility();
}

function hideStatus(message) {
  if (!internetStatusEl) return;
  if (internetStatusEl.innerText !== message) return;
  internetStatusEl.innerText = "";
  updateStatusVisibility();
}

export function updateProgress(message = "") {
  if (!progressEl) return;
  progressEl.innerText = message;
  updateStatusVisibility();

  // setTimeout(() => hideProgress(message), 5000);
}

export function updateStatus(message = "") {
  if (!internetStatusEl) return;
  internetStatusEl.innerText = message;
  updateStatusVisibility();

  // setTimeout(() => hideStatus(message), 5000);
}

export function initializeStatusListeners() {
  window.addEventListener("offline", () => {
    updateStatus("❌ No internet connection");
  });

  window.addEventListener("online", () => {
    updateStatus("✅ Internet connected");
  });
}
