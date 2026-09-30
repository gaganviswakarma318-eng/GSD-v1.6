/**
 * Builds yt-dlp CLI argument arrays for video and audio download tasks.
 */
const { BINARIES_PATH } = require("./fileUtils");

const DEFAULT_CONCURRENT_FRAGMENTS =
  process.env.YTDLP_CONCURRENT_FRAGMENTS || "4";
const AUDIO_FORMATS_WITHOUT_TRANSCODE = new Set([
  "m4a",
  "aac",
  "opus",
  "flac",
  "alac",
]);

function resolveMaxHeight(quality) {
  const match = String(quality || "best").match(/(\d+)p/);
  return match ? Number(match[1]) : null;
}

function buildVideoFormatSelector(format, quality) {
  const ext = format === "webm" ? "webm" : "mp4";
  const audioExt = ext === "webm" ? "webm" : "m4a";
  const maxHeight = resolveMaxHeight(quality);

  if (maxHeight) {
    return `bestvideo[height<=${maxHeight}][ext=${ext}]+bestaudio[ext=${audioExt}]/best[height<=${maxHeight}][ext=${ext}]`;
  }

  return `bestvideo[ext=${ext}]+bestaudio[ext=${audioExt}]/best[ext=${ext}]`;
}

/**
 * Builds args for a video download.
 * @param {string} url
 * @param {string} outputPath - yt-dlp output template path.
 * @param {string} [format="mp4"]
 * @param {string} [quality="best"]
 * @returns {string[]}
 */
function buildVideoArgs(url, outputPath, format = "mp4", quality = "best") {
  return [
    "-f",
    buildVideoFormatSelector(format, quality),

    "--newline",

    "--no-playlist",

    "--concurrent-fragments",
    DEFAULT_CONCURRENT_FRAGMENTS,

    "--ffmpeg-location",
    BINARIES_PATH,

    "-o",
    outputPath,

    url,

    "--merge-output-format",
    format,

    "--embed-thumbnail",

    "--add-metadata",

    "--js-runtimes",
    "node",
  ];
}

/**
 * Builds args for an audio-only download.
 * @param {string} url
 * @param {string} outputPath - yt-dlp output template path.
 * @param {string} [format="mp3"]
 * @param {string} [quality="best"]
 * @returns {string[]}
 */
function buildAudioArgs(url, outputPath, format = "mp3", quality = "best") {
  const qualityMap = {
    best: "0",
    high: "2",
    medium: "5",
    low: "8",
  };

  const normalizedFormat = String(format || "mp3").toLowerCase();
  const needsTranscoding =
    !AUDIO_FORMATS_WITHOUT_TRANSCODE.has(normalizedFormat);

  const args = [
    "-f",
    needsTranscoding ? "bestaudio" : `bestaudio[ext=${normalizedFormat}]`,

    "--newline",

    "--no-playlist",

    "--concurrent-fragments",
    DEFAULT_CONCURRENT_FRAGMENTS,

    "--ffmpeg-location",
    BINARIES_PATH,

    "-o",
    outputPath,

    url,

    "--embed-thumbnail",

    "--add-metadata",

    "--js-runtimes",
    "node",
  ];

  if (needsTranscoding) {
    args.splice(2, 0, "-x");
    args.splice(4, 0, "--audio-format", normalizedFormat);
    args.splice(6, 0, "--audio-quality", qualityMap[quality] || "0");
  } else {
    args.push("--audio-format", normalizedFormat);
  }

  return args;
}

module.exports = { buildVideoArgs, buildAudioArgs };
