/**
 * Download routes: session creation (start-download) and file delivery
 * (download). Logic lives in controllers/downloadController.js.
 */
const express = require("express");
const router = express.Router();

const {
  startDownload,
  download,
  pause,
  resume,
  cancel,
  retry,
} = require("../controllers/downloadController");

router.post("/start-download", startDownload);
router.get("/download", download);
router.post("/api/download/:downloadId/pause", pause);
router.post("/api/download/:downloadId/resume", resume);
router.post("/api/download/:downloadId/cancel", cancel);
router.post("/api/download/:downloadId/retry", retry);

module.exports = router;
