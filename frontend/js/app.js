import { initializeCustomDownload } from "./custom-download.js";
import { getInfo } from "./preview.js";
import { queueDownload, customDownload } from "./download.js";
import { urlInput, customDownloadBtn } from "./dom.js";

function bindEventListeners() {
  let previewTimer = null;

  urlInput?.addEventListener("input", () => {
    if (previewTimer) {
      window.clearTimeout(previewTimer);
    }

    previewTimer = window.setTimeout(() => {
      getInfo();
    }, 300);
  });

  customDownloadBtn?.addEventListener("click", customDownload);
}

function initializeApp() {
  bindEventListeners();
  initializeCustomDownload();
  window.queueDownload = queueDownload;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
