import { startDownloadSession } from "./api.js";
import { updateProgress } from "./status.js";
import { API_BASE } from "./constants.js";
import {
  urlInput,
  statusPanel,
  downloadType,
  downloadFormat,
  downloadQuality,
} from "./dom.js";

export async function queueDownload(type) {
  const url = urlInput?.value?.trim();

  if (!url) {
    updateProgress("❌ Enter a URL");
    return;
  }

  // updateProgress("⏳ Preparing download...");

  try {
    if (typeof window.startDownloadUI === "function") {
      await window.startDownloadUI(
        {
          url,
          type,
          format: null,
          quality: "best",
        },
        statusPanel || document.body,
      );
      return;
    }

    const downloadId = await startDownloadSession({
      url,
      type,
      format: null,
      quality: "best",
    });

    const downloadUrl = `${API_BASE}/download?downloadId=${encodeURIComponent(downloadId)}`;
    if (typeof window.triggerFileDownload === "function") {
      window.triggerFileDownload(downloadUrl);
    } else {
      window.location.href = downloadUrl;
    }
  } catch (error) {
    updateProgress(`❌ ${error.message}`);
    console.error(error);
  }
}

export async function customDownload() {
  const url = urlInput?.value?.trim();

  if (!url) {
    updateProgress("❌ Enter a URL");
    return;
  }

  const type = downloadType?.value;
  const format = downloadFormat?.value;
  const quality = downloadQuality?.value;

  updateProgress("⏳ Preparing custom download...");

  try {
    if (typeof window.startDownloadUI === "function") {
      await window.startDownloadUI(
        {
          url,
          type,
          format,
          quality,
        },
        statusPanel || document.body,
      );
      return;
    }

    const downloadId = await startDownloadSession({
      url,
      type,
      format,
      quality,
    });

    const downloadUrl = `${API_BASE}/download?downloadId=${encodeURIComponent(downloadId)}`;
    if (typeof window.triggerFileDownload === "function") {
      window.triggerFileDownload(downloadUrl);
    } else {
      window.location.href = downloadUrl;
    }
  } catch (error) {
    updateProgress(`❌ ${error.message}`);
    console.error(error);
  }
}
