const { getDownload, updateDownload } = require("../state/downloadState");
const { runDownload } = require("./downloadService");
const { cleanupDownloadArtifacts } = require("../utils/cleanup");

// FIFO Queue: allow a small number of active downloads without changing the public behavior.
const MAX_CONCURRENT_DOWNLOADS = Math.max(
  1,
  Math.min(
    3,
    Number.parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || "3", 10) || 3,
  ),
);
const downloadQueue = [];
const activeDownloads = new Set();
const taskMap = new Map();

function log(message, ...args) {
  console.log(`[queue] ${message}`, ...args);
}

function updateQueuePositions() {
  downloadQueue.forEach((task, index) => {
    if (!task.started) {
      const position = index + 1;
      updateDownload(task.downloadId, {
        queuePosition: position,
        queueLength: downloadQueue.length,
      });
    }
  });
}

function removeQueuedTask(task) {
  if (!task) return;
  task.cancelled = true;
  const index = downloadQueue.indexOf(task);
  if (index !== -1) {
    downloadQueue.splice(index, 1);
  }
  if (task.queueCloseListener && task.req) {
    task.req.off("close", task.queueCloseListener);
  }
  taskMap.delete(task.downloadId);
  updateQueuePositions();
}

function finishDownloadTask(task) {
  if (!task) return;
  activeDownloads.delete(task.downloadId);
  taskMap.delete(task.downloadId);
  log(
    `Download finished: ${task.downloadId}`,
    `queue_remaining=${downloadQueue.length}`,
  );
  startNextInQueue();
}

function startNextInQueue() {
  if (activeDownloads.size >= MAX_CONCURRENT_DOWNLOADS) {
    return;
  }

  while (downloadQueue.length > 0) {
    const nextTask = downloadQueue.shift();

    if (nextTask.cancelled) {
      taskMap.delete(nextTask.downloadId);
      log(`Skipped cancelled download: ${nextTask.downloadId}`);
      updateQueuePositions();
      continue;
    }

    log(
      `Starting next: ${nextTask.downloadId}`,
      `queue_remaining=${downloadQueue.length}`,
    );
    updateDownload(nextTask.downloadId, {
      status: "Downloading...",
      queuePosition: null,
      paused: false,
      cancelled: false,
      retrying: false,
    });
    startDownloadTask(nextTask);
    break;
  }

  updateQueuePositions();
}

function startDownloadTask(task) {
  task.started = true;
  task.settled = false;
  activeDownloads.add(task.downloadId);

  if (task.queueCloseListener && task.req) {
    task.req.off("close", task.queueCloseListener);
    task.queueCloseListener = null;
  }

  log(`Download started: ${task.downloadId} (${task.url})`);

  runDownload({
    downloadId: task.downloadId,
    url: task.url,
    type: task.type,
    format: task.format,
    quality: task.quality,
    req: task.req,
  })
    .then((resolvedFilePath) => {
      if (task.cancelled || task.settled) {
        return;
      }
      task.settled = true;
      log(`Download completed: ${task.downloadId} -> ${resolvedFilePath}`);
      task.resolve(resolvedFilePath);
      finishDownloadTask(task);
    })
    .catch((error) => {
      if (task.cancelled || task.settled) {
        return;
      }
      task.settled = true;
      log(`Download failed: ${task.downloadId} (${error.message})`);
      task.reject(error);
      finishDownloadTask(task);
    });
}

function enqueueDownloadTask(task) {
  if (taskMap.has(task.downloadId)) {
    return task.reject(
      new Error("A download for this downloadId is already in progress."),
    );
  }

  taskMap.set(task.downloadId, task);

  if (activeDownloads.size < MAX_CONCURRENT_DOWNLOADS) {
    updateDownload(task.downloadId, {
      status: "Downloading...",
      queuePosition: null,
      paused: false,
      cancelled: false,
      retrying: false,
    });
    startDownloadTask(task);
    return;
  }

  task.started = false;
  task.cancelled = false;
  task.settled = false;
  const position = downloadQueue.length + 1;

  updateDownload(task.downloadId, {
    status: "Waiting in queue",
    queuePosition: position,
    queueLength: downloadQueue.length + 1,
    paused: false,
    cancelled: false,
    retrying: false,
  });

  task.queueCloseListener = () => {
    if (task.started) return;
    removeQueuedTask(task);
    updateDownload(task.downloadId, {
      status: "Cancelled",
      error: "Client closed before download started",
      queuePosition: null,
      cancelled: true,
      paused: false,
    });
    task.reject(new Error("Client closed before download started"));
    log(
      `Download cancelled while queued: ${task.downloadId}`,
      `queue_remaining=${downloadQueue.length}`,
    );
    startNextInQueue();
  };

  if (task.req) {
    task.req.on("close", task.queueCloseListener);
  }

  downloadQueue.push(task);

  log(
    `Added to queue: ${task.downloadId} (position ${position})`,
    `queue_length=${downloadQueue.length}`,
  );
}

function requestDownload({ downloadId, url, type, format, quality, req }) {
  return new Promise((resolve, reject) => {
    enqueueDownloadTask({
      downloadId,
      url,
      type,
      format,
      quality,
      req,
      resolve,
      reject,
      queueCloseListener: null,
      started: false,
      cancelled: false,
      settled: false,
    });
  });
}

function pauseDownload(downloadId) {
  const download = getDownload(downloadId);
  if (!download) {
    return { ok: false, error: "Invalid download ID" };
  }
  if (download.completed) {
    return { ok: false, error: "Download already completed" };
  }
  if (download.cancelled) {
    return { ok: false, error: "Download already cancelled" };
  }
  if (download.paused) {
    return { ok: false, error: "Download already paused" };
  }
  if (!download.processHandle) {
    return { ok: false, error: "Process not found" };
  }

  try {
    download.processHandle.kill("SIGSTOP");
  } catch (error) {
    return { ok: false, error: "Unable to pause download process" };
  }

  updateDownload(downloadId, {
    status: "Paused",
    paused: true,
    cancelled: false,
  });
  return { ok: true, download: getDownload(downloadId) };
}

function resumeDownload(downloadId) {
  const download = getDownload(downloadId);
  if (!download) {
    return { ok: false, error: "Invalid download ID" };
  }
  if (download.completed) {
    return { ok: false, error: "Download already completed" };
  }
  if (download.cancelled) {
    return { ok: false, error: "Download already cancelled" };
  }
  if (!download.paused) {
    return { ok: false, error: "Download is already resumed" };
  }
  if (!download.processHandle) {
    return { ok: false, error: "Process not found" };
  }

  try {
    download.processHandle.kill("SIGCONT");
  } catch (error) {
    return { ok: false, error: "Unable to resume download process" };
  }

  updateDownload(downloadId, {
    status: "Downloading...",
    paused: false,
    cancelled: false,
  });
  return { ok: true, download: getDownload(downloadId) };
}

function cancelDownload(downloadId) {
  const download = getDownload(downloadId);
  if (!download) {
    return { ok: false, error: "Invalid download ID" };
  }
  if (download.completed) {
    return { ok: false, error: "Download already completed" };
  }
  if (download.cancelled) {
    return { ok: false, error: "Download already cancelled" };
  }

  const task = taskMap.get(downloadId);
  if (task) {
    task.cancelled = true;
  }

  if (download.processHandle && !download.processHandle.killed) {
    try {
      download.processHandle.kill("SIGKILL");
    } catch (error) {
      console.error("Failed to stop yt-dlp process:", error.message);
    }
  }

  cleanupDownloadArtifacts(download);

  if (task) {
    if (!task.started) {
      removeQueuedTask(task);
    } else {
      activeDownloads.delete(downloadId);
    }
    taskMap.delete(downloadId);
    if (task.started) {
      task.reject(new Error("Download cancelled"));
      finishDownloadTask(task);
    } else {
      task.reject(new Error("Download cancelled"));
      startNextInQueue();
    }
  } else {
    activeDownloads.delete(downloadId);
    taskMap.delete(downloadId);
    startNextInQueue();
  }

  updateDownload(downloadId, {
    status: "Cancelled",
    cancelled: true,
    paused: false,
    error: "Download cancelled",
    queuePosition: null,
  });

  return { ok: true, download: getDownload(downloadId) };
}

function retryDownload(downloadId) {
  const download = getDownload(downloadId);
  if (!download) {
    return { ok: false, error: "Invalid download ID" };
  }
  if (download.completed) {
    return { ok: false, error: "Download already completed" };
  }
  if (download.cancelled) {
    return { ok: false, error: "Download already cancelled" };
  }
  if (!download.error) {
    return { ok: false, error: "Download is not in a failed state" };
  }

  updateDownload(downloadId, {
    status: "Queued",
    error: null,
    paused: false,
    cancelled: false,
    completed: false,
    retrying: true,
    percent: 0,
    progress: 0,
    percentage: 0,
    downloaded: 0,
    downloadedSize: 0,
    total: 0,
    totalSize: 0,
    speed: null,
    eta: null,
  });

  taskMap.delete(downloadId);
  return requestDownload({
    downloadId,
    url: download.url,
    type: download.type,
    format: download.format,
    quality: download.quality,
    req: null,
  });
}

module.exports = {
  requestDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  retryDownload,
  activeDownloads,
};
