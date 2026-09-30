/**
 * SSE controller for GET /progress/:downloadId.
 * Pushes the current download state immediately on connect, then streams
 * every subsequent update as it happens — no polling, no setInterval.
 */
const { getDownload, progressEmitter } = require("../state/downloadState");

/**
 * GET /progress/:downloadId
 */
function streamProgress(req, res) {
  const { downloadId } = req.params;

  const download = getDownload(downloadId);
  if (!download) {
    return res.status(404).json({ error: "Unknown or expired downloadId" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    // Prevents proxies like nginx from buffering the stream.
    "X-Accel-Buffering": "no",
  });

  // Flush current state right away so the UI doesn't wait for the next change.
  res.write(`data: ${JSON.stringify(download)}\n\n`);

  const onUpdate = (updatedDownload) => {
    res.write(`data: ${JSON.stringify(updatedDownload)}\n\n`);

    if (updatedDownload.completed || updatedDownload.status === "Failed") {
      cleanup();
    }
  };

  const cleanup = () => {
    progressEmitter.removeListener(downloadId, onUpdate);
    if (!res.writableEnded) res.end();
  };

  progressEmitter.on(downloadId, onUpdate);

  // Client navigated away, closed the tab, or the EventSource was closed.
  req.on("close", cleanup);
}

module.exports = { streamProgress };
