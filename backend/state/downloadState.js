/**
 * In-memory store for active download sessions, keyed by downloadId.
 * Also hosts the EventEmitter that services push progress updates through,
 * which routes/progress.js's SSE handler subscribes to.
 *
 * Lifecycle / memory-leak avoidance:
 *  - A session created but never picked up by GET /download is removed
 *    after IDLE_TTL_MS.
 *  - A session that reaches "Completed" or "Failed" is removed
 *    FINISHED_TTL_MS after that, giving any open SSE connection time to
 *    receive the final event before the record disappears.
 *  - Every scheduled removal clears any previous timer for that id, so
 *    repeated updates don't stack up multiple timeouts.
 */
const { EventEmitter } = require("events");

const activeDownloads = new Map();
const cleanupTimers = new Map();

const progressEmitter = new EventEmitter();
// Many concurrent downloads = many listeners on distinct event names; raise
// the default cap so Node doesn't warn about a "memory leak" that isn't one.
progressEmitter.setMaxListeners(0);

const IDLE_TTL_MS = 10 * 60 * 1000; // 10 min: session created but never started
const FINISHED_TTL_MS = 5 * 60 * 1000; // 5 min: grace period after completion/failure

/**
 * (Re)schedules removal of a download record.
 * @param {string} id
 * @param {number} delayMs
 */
function scheduleRemoval(id, delayMs) {
  clearTimeout(cleanupTimers.get(id));
  const timer = setTimeout(() => removeDownload(id), delayMs);
  cleanupTimers.set(id, timer);
}

/**
 * Creates a new download session.
 * @param {string} id
 * @param {Object} [meta] - url/type/format/quality captured at start-download time.
 * @returns {Object} The created download record.
 */
function createDownload(id, meta = {}) {
  const download = {
    id,
    status: "Preparing...",
    percent: 0,
    progress: 0,
    percentage: 0,
    downloaded: 0,
    downloadedSize: 0,
    total: 0,
    totalSize: 0,
    speed: null,
    eta: null,
    filePath: null,
    filename: meta.filename || null,
    completed: false,
    error: null,
    queuePosition: null,
    queueLength: 0,
    paused: false,
    cancelled: false,
    retrying: false,
    processHandle: null,
    ...meta,
  };

  activeDownloads.set(id, download);
  scheduleRemoval(id, IDLE_TTL_MS);
  return download;
}

/**
 * @param {string} id
 * @returns {Object|undefined}
 */
function getDownload(id) {
  return activeDownloads.get(id);
}

/**
 * Merges updates into a download record and emits the updated record
 * to any subscribed SSE listeners.
 * @param {string} id
 * @param {Object} updates
 * @returns {Object|null} The updated record, or null if the id is unknown.
 */
function updateDownload(id, updates) {
  const download = activeDownloads.get(id);
  if (!download) return null;

  Object.assign(download, updates);

  const hasProgressUpdates =
    updates.percent != null ||
    updates.progress != null ||
    updates.percentage != null ||
    updates.downloaded != null ||
    updates.total != null ||
    updates.downloadedSize != null ||
    updates.totalSize != null;

  if (hasProgressUpdates) {
    const nextPercent =
      updates.percent ??
      updates.progress ??
      updates.percentage ??
      download.percent ??
      0;
    const nextDownloaded =
      updates.downloaded ?? updates.downloadedSize ?? download.downloaded ?? 0;
    const nextTotal = updates.total ?? updates.totalSize ?? download.total ?? 0;

    download.percent = nextPercent;
    download.progress = nextPercent;
    download.percentage = nextPercent;
    download.downloaded = nextDownloaded;
    download.downloadedSize = nextDownloaded;
    download.total = nextTotal;
    download.totalSize = nextTotal;
  }

  if (updates.filename != null) {
    download.filename = updates.filename;
  }

  progressEmitter.emit(id, download);

  if (download.completed || download.status === "Failed") {
    scheduleRemoval(id, FINISHED_TTL_MS);
  }

  return download;
}

/**
 * Removes a download record and clears its timer/listeners.
 * @param {string} id
 */
function removeDownload(id) {
  activeDownloads.delete(id);
  clearTimeout(cleanupTimers.get(id));
  cleanupTimers.delete(id);
  progressEmitter.removeAllListeners(id);
}

module.exports = {
  activeDownloads,
  progressEmitter,
  createDownload,
  getDownload,
  updateDownload,
  removeDownload,
};
