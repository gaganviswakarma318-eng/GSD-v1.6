/**
 * Express backend server for Downloader Pro.
 * Serves frontend assets, manages download queue and yt-dlp integration,
 * provides metadata fetching, cache management, and file delivery.
 * Used by electron/main.js and the browser frontend in frontend/js/script.js.
 */
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");

require("dotenv").config();

const {
  FRONTEND_PATH,
  YT_DLP_PATH,
  FFMPEG_PATH,
} = require("./utils/fileUtils");

const progressRoute = require("./routes/progress");
const infoRoute = require("./routes/info");
const downloadRoute = require("./routes/download");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware ---------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const clientIp = req.ip || req.socket?.remoteAddress || "unknown";

  console.log(
    `[${req.requestId}] ${timestamp} ${clientIp} ${req.method} ${req.originalUrl}`,
  );

  res.on("finish", () => {
    console.log(
      `[${req.requestId}] ${new Date().toISOString()} ${req.method} ${req.originalUrl} RESPONSE finished status=${res.statusCode}`,
    );
  });

  res.on("close", () => {
    console.log(
      `[${req.requestId}] ${new Date().toISOString()} ${req.method} ${req.originalUrl} RESPONSE closed`,
    );
  });

  next();
});
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});
app.use(express.static(FRONTEND_PATH));

// Routes ---------------------------------------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "index.html"));
});

app.use(progressRoute);
app.use(infoRoute);
app.use(downloadRoute);

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `✅ Server running at http://0.0.0.0:${PORT} (also accessible via this machine's LAN IP)`,
  );
  console.log("YT-DLP:", YT_DLP_PATH);
  console.log("FFMPEG:", FFMPEG_PATH);
});
