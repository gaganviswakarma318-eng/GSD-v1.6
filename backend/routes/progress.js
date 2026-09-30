/**
 * Progress routes.
 *  - GET /progress            legacy global-text polling endpoint, unchanged.
 *  - GET /progress/:downloadId  new SSE stream for a specific download session.
 */
const express = require("express");
const router = express.Router();
const { getProgress } = require("../services/progressService");
const { streamProgress } = require("../controllers/progressController");

router.get("/progress", (req, res) => {
  res.send(getProgress());
});

router.get("/progress/:downloadId", streamProgress);

module.exports = router;
