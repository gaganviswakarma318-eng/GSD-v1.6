const API_BASE =
  window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;

// URL INPUT ========================================================================

const urlInput = document.getElementById("url");

// API Calls
/**
 * Fetches video/audio metadata from backend/server.js and updates the UI.
 * @returns {Promise<void>}
 * Called when the user pastes or enters a URL and preview data is needed.
 */

async function getInfo() {
  const url = urlInput?.value?.trim();

  if (!url) {
    updateProgress("❌ Enter a URL");

    titleEl.innerText = "";
    thumbnailEl.removeAttribute("src");
    updatePreviewVisibility();
    return;
  }

  try {
    new URL(url);
  } catch {
    updateProgress("❌ Invalid URL");

    titleEl.innerText = "";
    thumbnailEl.removeAttribute("src");
    updatePreviewVisibility();
    return;
  }

  try {
    // Make preview panel visible first so skeleton can be seen
    if (previewPanel) {
      previewPanel.style.display = "block";
    }

    // Clear old preview content
    titleEl.innerText = "";
    thumbnailEl.removeAttribute("src");

    // Add skeleton classes
    showSkeleton();

    updateProgress("⏳ Fetching info...");

    const response = await fetch(
      `${API_BASE}/info?url=${encodeURIComponent(url)}`,
    );

    const data = await response.json();

    // Remove skeleton after data arrives
    hideSkeleton();

    // Fill preview content
    titleEl.innerText = data.title || "";
    thumbnailEl.src = data.thumbnail || "";

    // Decide whether preview should stay visible
    updatePreviewVisibility();

    updateProgress("");
  } catch (error) {
    console.error(error);

    hideSkeleton();

    // Clear preview if fetch failed
    titleEl.innerText = "";
    thumbnailEl.removeAttribute("src");

    updatePreviewVisibility();

    updateProgress("❌ Failed to fetch info");
  }
}

// Auto fetch metadata shortly after a paste event completes.
urlInput?.addEventListener("input", () => {
  getInfo();
});

// DOWNLOAD BUTTONS ==================================================================

const customToggle = document.getElementById("customDownloadToggle");
const customPanel = document.getElementById("customDownloadPanel");

const downloadType = document.getElementById("downloadType");
const downloadFormat = document.getElementById("downloadFormat");
const downloadQuality = document.getElementById("downloadQuality");

const customDownloadBtn = document.getElementById("customDownloadBtn");

// Download Initiation
/**
 * Starts a download session and navigates the browser to the file endpoint.
 * @param {string} type - Download type, either "video" or "audio".
 */
async function startDownloadSession({ url, type, format, quality }) {
  const response = await fetch(`${API_BASE}/start-download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, type, format, quality }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Failed to start download");
  }

  const { downloadId } = await response.json();
  return downloadId;
}

async function queueDownload(type) {
  const url = urlInput?.value?.trim();

  if (!url) {
    updateProgress("❌ Enter a URL");
    return;
  }

  updateStatus(`✅ Starting ${type} download`);
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

const DOWNLOAD_OPTIONS = {
  audio: {
    formats: [
      {
        value: "m4a",
        label: "M4A (AAC)",
      },
      {
        value: "mp3",
        label: "MP3",
      },
      {
        value: "opus",
        label: "Opus",
      },
    ],

    qualities: ["best", "high", "medium", "low"],
  },

  video: {
    formats: [
      {
        value: "mp4",
        label: "MP4",
      },
      {
        value: "webm",
        label: "WebM",
      },
    ],

    qualities: ["best", "2160p", "1440p", "1080p", "720p", "480p", "360p"],
  },
};
// Add Dynamic Dropdown Population
function populateCustomOptions(type) {
  if (!downloadFormat || !downloadQuality) return;

  downloadFormat.innerHTML = "";
  downloadQuality.innerHTML = "";

  const config = DOWNLOAD_OPTIONS[type];

  config.formats.forEach((format) => {
    const option = document.createElement("option");

    option.value = format.value;
    option.textContent = format.label;

    downloadFormat.appendChild(option);
  });

  config.qualities.forEach((quality) => {
    const option = document.createElement("option");

    option.value = quality;
    option.textContent = quality;

    downloadQuality.appendChild(option);
  });
}

// Add Expand / Collapse Logic
function initializeCustomDownload() {
  if (!customToggle || !customPanel || !downloadType) {
    return;
  }

  populateCustomOptions("audio");

  customToggle.addEventListener("click", () => {
    const isOpen = customPanel.classList.contains("open");

    if (isOpen) {
      customPanel.classList.remove("open");
      customPanel.classList.add("closing");

      window.clearTimeout(customPanel._closingTimer);
      customPanel._closingTimer = window.setTimeout(() => {
        customPanel.classList.remove("closing");
      }, 250);
    } else {
      customPanel.classList.remove("closing");
      customPanel.classList.add("open");
    }

    customToggle.classList.toggle("active");

    customToggle.setAttribute("aria-expanded", String(!isOpen));

    customPanel.setAttribute("aria-hidden", String(isOpen));
  });

  downloadType.addEventListener("change", (e) => {
    populateCustomOptions(e.target.value);
  });
}

// Add Custom Download Function
async function customDownload() {
  const url = urlInput?.value?.trim();

  if (!url) {
    updateProgress("❌ Enter a URL");
    return;
  }

  const type = downloadType.value;
  const format = downloadFormat.value;
  const quality = downloadQuality.value;

  updateStatus(`✅ Starting ${type} download`);
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

// Attach Download Button Event
customDownloadBtn?.addEventListener("click", customDownload);

// Initialize Custom Download
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCustomDownload);
} else {
  initializeCustomDownload();
}

// PREVIEW =============================================================================

const previewPanel = document.getElementById("preview");

// Show preview panel only when title or thumbnail exists.

function updatePreviewVisibility() {
  if (!previewPanel) return;

  const hasTitle = titleEl && titleEl.textContent.trim();

  const hasThumbnail =
    thumbnailEl &&
    thumbnailEl.getAttribute("src") &&
    thumbnailEl.getAttribute("src").trim() !== "";

  previewPanel.style.display = hasTitle || hasThumbnail ? "block" : "none";
}

const titleEl = document.getElementById("title");
const thumbnailEl = document.getElementById("thumbnail");

/**
 * Adds skeleton loading classes while metadata is being fetched.
 */
function showSkeleton() {
  titleEl?.classList.add("skeleton", "skeleton-title");

  thumbnailEl?.classList.add("skeleton", "skeleton-thumb");
}

/**
 * Removes skeleton loading classes once metadata is loaded.
 */
function hideSkeleton() {
  titleEl?.classList.remove("skeleton", "skeleton-title");

  thumbnailEl?.classList.remove("skeleton", "skeleton-thumb");
}

// STATUS ================================================================================
const statusPanel = document.getElementById("status");

//  Show status panel only when progress or status exists.
function updateStatusVisibility() {
  if (!statusPanel) return;

  const hasProgress = progressEl && progressEl.textContent.trim();
  const hasStatus = internetStatusEl && internetStatusEl.textContent.trim();
  const hasWidget = statusPanel.querySelector(".dlp-widget");

  statusPanel.style.display =
    hasProgress || hasStatus || hasWidget ? "flex" : "none";
}

/**
 * Updates the download progress message in the UI.
 * @param {string} message - Progress text to display.
 */

const progressEl = document.getElementById("progress");
function updateProgress(message = "") {
  if (!progressEl) return;

  progressEl.innerText = message;

  updateStatusVisibility();
}

/**
 * Updates the backend connection status message in the UI.
 * @param {string} message - Status text to display.
 */
const internetStatusEl = document.getElementById("internet-status");

function updateStatus(message = "") {
  if (!internetStatusEl) return;

  internetStatusEl.innerText = message;

  updateStatusVisibility();
}

// Online / Offline Detection-------------------------
window.addEventListener("offline", () => {
  updateStatus("❌ No internet connection");
});

window.addEventListener("online", () => {
  updateStatus("✅ Internet connected");
});
