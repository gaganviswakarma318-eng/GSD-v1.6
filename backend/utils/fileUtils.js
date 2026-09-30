/**
 * Path helpers: resolves binary locations and app directories,
 * accounting for packaged (production/Electron) vs dev environments.
 */
const path = require("path");

const BACKEND_ROOT = path.join(__dirname, "..");
const FRONTEND_PATH = path.join(BACKEND_ROOT, "../frontend");
const TEMP_PATH = path.join(BACKEND_ROOT, "temp");

const isProduction = process.env.NODE_ENV === "production";

const BINARIES_PATH = isProduction
  ? path.join(process.resourcesPath, "binaries")
  : path.join(BACKEND_ROOT, "binaries");

const YT_DLP_PATH = path.join(BINARIES_PATH, "yt-dlp.exe");
const FFMPEG_PATH = path.join(BINARIES_PATH, "ffmpeg.exe");

module.exports = {
  BACKEND_ROOT,
  FRONTEND_PATH,
  TEMP_PATH,
  BINARIES_PATH,
  YT_DLP_PATH,
  FFMPEG_PATH,
  isProduction,
};
