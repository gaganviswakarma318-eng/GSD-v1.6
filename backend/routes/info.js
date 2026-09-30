/**
 * Provides metadata for a given video URL using yt-dlp without downloading.
 * Uses TTL-based caching to reduce repeated yt-dlp calls.
 */
const express = require("express");
const router = express.Router();

const { getCached, setCached } = require("../services/cacheService");
const { fetchInfo } = require("../services/ytDlpService");

router.get("/info", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  const cached = getCached(url);
  if (cached) {
    return res.json(cached);
  }

  try {
    const data = await fetchInfo(url);
    setCached(url, data);
    res.json(data);
  } catch (error) {
    console.error("Info lookup failed:", error.message);
    res.status(504).json({ error: error.message || "Metadata lookup failed" });
  }
});

module.exports = router;
