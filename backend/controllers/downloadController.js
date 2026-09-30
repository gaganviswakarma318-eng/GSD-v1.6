/**
 * Controller for the download flow:
 *  - startDownload: creates a session and returns a downloadId (no yt-dlp yet).
 *  - download: looks up that session, runs yt-dlp against its stored params,
 *    and streams the resulting file back once done.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  createDownload,
  getDownload,
  removeDownload,
  updateDownload,
} = require("../state/downloadState");
const {
  requestDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  retryDownload,
} = require("../services/downloadManager");
const { cleanupFile } = require("../utils/cleanup");

const POST_FINISH_CLEANUP_MS = 5 * 60 * 1000; // grace period, mirrors state's own TTL

/**
 * POST /start-download
 * Body: { url, type, format?, quality? }
 * Creates a download session and returns its id. Does not start yt-dlp.
 */
function startDownload(req, res) {
  const requestId = req.requestId || "unknown";
  const { url, type, format, quality } = req.body || {};

  console.log(
    `[${requestId}] ${new Date().toISOString()} POST /start-download url=${url} type=${type} format=${format} quality=${quality}`,
  );

  if (!url || !type) {
    return res.status(400).json({ error: "Missing url or type" });
  }

  if (type !== "video" && type !== "audio") {
    return res.status(400).json({ error: "type must be 'video' or 'audio'" });
  }

  const downloadId = crypto.randomUUID();

  createDownload(downloadId, {
    url,
    type,
    format: format || null,
    quality: quality || "best",
  });

  res.json({ downloadId });
}

/**
 * Resolves the Content-Type header for the response based on media type/format.
 */
function resolveContentType(type, format) {
  if (type === "video") {
    return format === "webm" ? "video/webm" : "video/mp4";
  }

  switch (format) {
    case "m4a":
      return "audio/mp4";
    case "opus":
      return "audio/ogg";
    default:
      return "audio/mpeg";
  }
}

/**
 * GET /download?downloadId=...
 * Reuses the session created by /start-download (does not create a new one),
 * runs yt-dlp, then streams the resulting file to the client.
 */
async function download(req, res) {
  const requestId = req.requestId || "unknown";
  const {
    downloadId,
    url: legacyUrl,
    type: legacyType,
    format: legacyFormat,
    quality: legacyQuality,
  } = req.query;

  console.log(
    `[${requestId}] ${new Date().toISOString()} GET /download downloadId=${downloadId} legacyUrl=${legacyUrl} legacyType=${legacyType} legacyFormat=${legacyFormat} legacyQuality=${legacyQuality}`,
  );

  let sessionId = downloadId;
  let session = sessionId ? getDownload(sessionId) : null;

  if (!sessionId) {
    if (!legacyUrl || !legacyType) {
      return res.status(400).send("Missing downloadId or download parameters");
    }

    if (legacyType !== "video" && legacyType !== "audio") {
      return res.status(400).send("type must be 'video' or 'audio'");
    }

    sessionId = crypto.randomUUID();
    createDownload(sessionId, {
      url: legacyUrl,
      type: legacyType,
      format: legacyFormat || null,
      quality: legacyQuality || "best",
    });
    session = getDownload(sessionId);
  }

  if (!session) {
    return res.status(404).send("Unknown or expired downloadId");
  }

  const { url, type, format, quality } = session;

  let resolvedFilePath;
  try {
    updateDownload(sessionId, { status: "Queued" });
    resolvedFilePath = await requestDownload({
      downloadId: sessionId,
      url,
      type,
      format,
      quality,
      req,
    });
  } catch (error) {
    if (res.writableEnded) return;
    if (error.message === "Unable to locate generated file") {
      return res.status(500).send("Unable to locate generated file");
    }
    return res.status(500).send("Download generation failed");
  }

  if (res.writableEnded) return;

  const normalizedPath = path.normalize(
    resolvedFilePath.trim().replace(/^"+|"+$/g, ""),
  );
  const filename = path.basename(normalizedPath).replace(/"/g, "");
  const stats = await fs.promises.stat(normalizedPath);

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const safeFilename = filename
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[<>:"/\\|?*]/g, "_");

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename}"`,
  );
  res.setHeader("Content-Type", resolveContentType(type, format));
  res.setHeader("Content-Length", stats.size);
  res.setHeader("Accept-Ranges", "bytes");

  const fileStream = fs.createReadStream(normalizedPath, {
    highWaterMark: 1024 * 1024,
  });

  res.on("finish", () => {
    console.log(
      `[${requestId}] ${new Date().toISOString()} response finished streaming ${normalizedPath}`,
    );
  });

  res.on("close", () => {
    console.log(
      `[${requestId}] ${new Date().toISOString()} response closed while streaming ${normalizedPath}`,
    );
  });

  fileStream.on("open", () => {
    console.log(
      `[${requestId}] ${new Date().toISOString()} response stream opened for ${normalizedPath}`,
    );
  });

  fileStream.on("error", (error) => {
    console.error("Error reading generated file:", error.message);
    if (!res.headersSent) {
      res.status(500).send("Unable to read generated file");
    }
  });

  fileStream.on("close", () => {
    console.log(
      `[${requestId}] ${new Date().toISOString()} response stream closed for ${normalizedPath}`,
    );
    cleanupFile(normalizedPath);
    // Session already schedules its own TTL cleanup on completion in
    // downloadState.js; this is just a safety net in case that path
    // was somehow skipped (e.g. state updated out of band).
    setTimeout(() => removeDownload(sessionId), POST_FINISH_CLEANUP_MS);
  });

  console.log(
    `[${requestId}] ${new Date().toISOString()} streaming file ${normalizedPath} size=${stats.size}`,
  );

  fileStream.pipe(res);
}

function handleDownloadAction(actionName, req, res) {
  const { downloadId } = req.params;
  if (!downloadId) {
    return res.status(400).json({ error: "Missing downloadId" });
  }

  let result;
  try {
    if (actionName === "pause") {
      result = pauseDownload(downloadId);
    } else if (actionName === "resume") {
      result = resumeDownload(downloadId);
    } else if (actionName === "cancel") {
      result = cancelDownload(downloadId);
    } else if (actionName === "retry") {
      result = retryDownload(downloadId);
    } else {
      return res.status(400).json({ error: "Unknown action" });
    }
  } catch (error) {
    console.error(`Control action failed: ${actionName}`, error);
    return res.status(500).json({ error: "Unexpected server error" });
  }

  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({ ok: true, download: result.download });
}

async function pause(req, res) {
  return handleDownloadAction("pause", req, res);
}

async function resume(req, res) {
  return handleDownloadAction("resume", req, res);
}

async function cancel(req, res) {
  return handleDownloadAction("cancel", req, res);
}

async function retry(req, res) {
  return handleDownloadAction("retry", req, res);
}

module.exports = {
  startDownload,
  download,
  pause,
  resume,
  cancel,
  retry,
};
