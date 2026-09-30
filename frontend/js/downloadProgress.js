/*
 * downloadProgress.js
 * Extracted from script.js: standalone download progress UI module.
 * Exposes `startDownloadUI` and `triggerFileDownload` on `window`.
 */

const DOWNLOAD_PROGRESS_API_BASE =
  window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;

if (typeof window.__downloadProgressInitialized === "undefined") {
  window.__downloadProgressInitialized = false;
}

function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "--";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function triggerDownload(url) {
  let iframe = document.getElementById("download-frame");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "download-frame";
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);
  }
  iframe.src = url;
}

async function controlDownload(downloadId, action) {
  const response = await fetch(
    `${DOWNLOAD_PROGRESS_API_BASE}/api/download/${encodeURIComponent(downloadId)}/${action}`,
    { method: "POST" },
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Failed to ${action} download`);
  }

  return body;
}

function buildProgressWidget() {
  const root = document.createElement("div");
  root.className = "dlp-widget";
  root.innerHTML = `
    <div class="dlp-status-row">
      <span class="dlp-status">Preparing...</span>
      <span class="dlp-size">-- / --</span>
    </div>
    <div class="dlp-filename">Preparing download...</div>
    <div class="dlp-bar-track">
      <div class="dlp-bar-fill" style="width: 0%"></div>
      <div class="dlp-bubble" style="left: 0%">0%</div>
    </div>
    <div class="dlp-meta-row">
      <span class="dlp-speed">-- </span>
      <span class="dlp-eta">ETA --</span>
    </div>
    <div class="dlp-actions">
      <button type="button" class="dlp-action-btn" data-action="pause">Pause</button>
      <button type="button" class="dlp-action-btn" data-action="resume">Resume</button>
      <button type="button" class="dlp-action-btn" data-action="cancel">Cancel</button>
      <button type="button" class="dlp-action-btn" data-action="retry">Retry</button>
    </div>
  `;

  return {
    root,
    els: {
      status: root.querySelector(".dlp-status"),
      filename: root.querySelector(".dlp-filename"),
      size: root.querySelector(".dlp-size"),
      fill: root.querySelector(".dlp-bar-fill"),
      bubble: root.querySelector(".dlp-bubble"),
      speed: root.querySelector(".dlp-speed"),
      eta: root.querySelector(".dlp-eta"),
      track: root.querySelector(".dlp-bar-track"),
      actions: root.querySelector(".dlp-actions"),
      pauseBtn: root.querySelector('[data-action="pause"]'),
      resumeBtn: root.querySelector('[data-action="resume"]'),
      cancelBtn: root.querySelector('[data-action="cancel"]'),
      retryBtn: root.querySelector('[data-action="retry"]'),
    },
  };
}

function setActionVisibility(els, state, canControl) {
  const isCompleted = !!state.completed || state.status === "Completed";
  const isCancelled = state.cancelled || state.status === "Cancelled";
  const isFailed = state.status === "Failed";
  const isPaused = state.paused || state.status === "Paused";
  const isQueued =
    state.status === "Waiting in queue" || state.status === "Queued";

  els.pauseBtn.classList.toggle(
    "is-hidden",
    !canControl ||
      isCompleted ||
      isCancelled ||
      isFailed ||
      isPaused ||
      isQueued,
  );
  els.resumeBtn.classList.toggle(
    "is-hidden",
    !canControl || isCompleted || isCancelled || isFailed || !isPaused,
  );
  els.cancelBtn.classList.toggle(
    "is-hidden",
    !canControl || isCompleted || isCancelled,
  );
  els.retryBtn.classList.toggle("is-hidden", !canControl || !isFailed);

  els.pauseBtn.disabled =
    !canControl ||
    isCompleted ||
    isCancelled ||
    isFailed ||
    isPaused ||
    isQueued;
  els.resumeBtn.disabled =
    !canControl || isCompleted || isCancelled || isFailed || !isPaused;
  els.cancelBtn.disabled = !canControl || isCompleted || isCancelled;
  els.retryBtn.disabled = !canControl || !isFailed;
}

function renderState(els, state, options = {}) {
  const percent = Math.max(
    0,
    Math.min(100, state.percent || state.progress || state.percentage || 0),
  );
  const canControl = options.canControl !== false;

  let statusText = state.status || "";
  if (state.status === "Waiting in queue" && state.queuePosition) {
    const ordinal = ["st", "nd", "rd"][state.queuePosition - 1] || "th";
    statusText = `${state.queuePosition}${ordinal} in queue`;
  }

  const isCompleted = !!state.completed || state.status === "Completed";
  const isCancelled = state.cancelled || state.status === "Cancelled";
  const isFailed = state.status === "Failed";
  const isPaused = state.paused || state.status === "Paused";
  const isQueued =
    state.status === "Waiting in queue" || state.status === "Queued";

  els.status.textContent = statusText || "Preparing...";
  els.filename.textContent = state.filename || "Preparing download...";
  els.status.dataset.state = isCompleted
    ? "success"
    : isFailed
      ? "error"
      : isCancelled
        ? "cancelled"
        : isPaused
          ? "paused"
          : isQueued
            ? "waiting"
            : "active";

  els.fill.style.width = `${percent}%`;
  els.bubble.style.left = `${percent}%`;
  els.bubble.textContent = `${percent.toFixed(0)}%`;

  els.size.textContent = `${formatBytes(state.downloaded ?? state.downloadedSize)} / ${formatBytes(state.total ?? state.totalSize)}`;
  els.speed.textContent = state.speed ? `${state.speed}` : "--";
  els.eta.textContent = state.eta ? `ETA ${state.eta}` : "ETA --";

  if (isCompleted) {
    els.eta.textContent = "Done";
    els.speed.textContent = "Completed";
    els.size.textContent = `${formatBytes(state.downloaded ?? state.downloadedSize)} / ${formatBytes(state.total ?? state.totalSize)}`;
  }
  if (isFailed) {
    els.speed.textContent = state.error || "Download failed";
    els.eta.textContent = "";
  }
  if (isCancelled) {
    els.speed.textContent = "Cancelled";
    els.eta.textContent = "";
    els.size.textContent = "";
  }
  if (isQueued) {
    els.speed.textContent = "Queued";
    els.eta.textContent = "";
    els.size.textContent = "";
  }

  setActionVisibility(els, state, canControl);
}

async function startDownloadUI(params, container) {
  if (!document.body) {
    throw new Error("Document body is not ready");
  }
  const mount = container || document.body;
  if (mount && mount.style) {
    mount.style.display = "flex";
    mount.style.flexDirection = "column";
    mount.style.gap = "var(--gap-small)";
  }

  const { root, els } = buildProgressWidget();
  mount.appendChild(root);

  let downloadId;
  try {
    const startRes = await fetch(
      `${DOWNLOAD_PROGRESS_API_BASE}/start-download`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      },
    );

    if (!startRes.ok) {
      const body = await startRes.json().catch(() => ({}));
      throw new Error(body.error || "Failed to start download");
    }

    ({ downloadId } = await startRes.json());
  } catch (error) {
    els.status.textContent = "Failed to start download";
    els.status.dataset.state = "error";
    els.speed.textContent = error.message;
    return;
  }

  const eventSource = new EventSource(
    `${DOWNLOAD_PROGRESS_API_BASE}/progress/${downloadId}`,
  );
  let removalTimer = null;
  const clearRemovalTimer = () => {
    if (removalTimer) {
      window.clearTimeout(removalTimer);
      removalTimer = null;
    }
  };
  const scheduleRemoval = () => {
    clearRemovalTimer();
    removalTimer = window.setTimeout(() => {
      if (root.parentNode) {
        root.remove();
      }
    }, 1400);
  };

  const bindAction = (action) => {
    const button = els[`${action}Btn`];
    if (!button) return;

    button.addEventListener("click", async () => {
      if (!downloadId) return;
      button.disabled = true;
      try {
        await controlDownload(downloadId, action);
      } catch (error) {
        els.status.textContent = error.message;
        els.status.dataset.state = "error";
      } finally {
        button.disabled = false;
      }
    });
  };

  bindAction("pause");
  bindAction("resume");
  bindAction("cancel");
  bindAction("retry");

  eventSource.onmessage = (event) => {
    const state = JSON.parse(event.data);
    renderState(els, state, { canControl: true });

    if (
      state.completed ||
      state.status === "Failed" ||
      state.cancelled ||
      state.status === "Cancelled"
    ) {
      eventSource.close();
      if (state.cancelled || state.status === "Cancelled") {
        scheduleRemoval();
      }
    } else {
      clearRemovalTimer();
    }
  };

  eventSource.onerror = () => {
    if (els.status.dataset.state === "active") {
      els.status.textContent = "Connection lost";
      els.status.dataset.state = "error";
    }
    eventSource.close();
  };

  const downloadUrl = `${DOWNLOAD_PROGRESS_API_BASE}/download?downloadId=${encodeURIComponent(downloadId)}`;
  triggerDownload(downloadUrl);
}

window.startDownloadUI = startDownloadUI;
window.triggerFileDownload = triggerDownload;
window.__downloadProgressInitialized = true;
