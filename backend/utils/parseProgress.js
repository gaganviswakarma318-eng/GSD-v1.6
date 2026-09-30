/**
 * Parses yt-dlp CLI output into structured progress info and
 * human-readable processing-stage labels.
 */

const SIZE_REGEX = /^([\d.]+)\s*(KiB|MiB|GiB|B)$/i;

const BYTE_MULTIPLIERS = {
  B: 1,
  KIB: 1024,
  MIB: 1024 ** 2,
  GIB: 1024 ** 3,
};

/**
 * Converts a yt-dlp size string (e.g. "4.06MiB") into bytes.
 * @param {string} sizeStr
 * @returns {number|null}
 */
function parseSizeToBytes(sizeStr) {
  if (!sizeStr) return null;
  const match = sizeStr.trim().match(SIZE_REGEX);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  return Math.round(value * (BYTE_MULTIPLIERS[unit] || 1));
}

// Matches lines like: "[download]  49.2% of 4.06MiB at 8.03MiB/s ETA 00:00"
// total/speed can also appear as "~4.06MiB" or "Unknown speed"/"Unknown" ETA.
const DOWNLOAD_LINE_REGEX =
  /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\w+)\s+at\s+([\d.]+\w+\/s|Unknown speed)\s+ETA\s+([\d:]+|Unknown)/;

/**
 * Parses a single yt-dlp progress line.
 * @param {string} line
 * @returns {{percent:number, total:number|null, downloaded:number|null, speed:string|null, eta:string|null}|null}
 *   Returns null if the line isn't a progress line.
 */
function parseDownloadLine(line) {
  const match = line.match(DOWNLOAD_LINE_REGEX);
  if (!match) return null;

  const percent = parseFloat(match[1]);
  const total = parseSizeToBytes(match[2]);
  const speed = match[3] === "Unknown speed" ? null : match[3];
  const eta = match[4] === "Unknown" ? null : match[4];
  const downloaded = total != null ? Math.round((percent / 100) * total) : null;

  return { percent, total, downloaded, speed, eta };
}

// Known yt-dlp postprocessor markers mapped to user-facing status text.
const STAGE_MARKERS = [
  { marker: "[ExtractAudio]", status: "Extracting Audio..." },
  { marker: "[Merger]", status: "Merging Video..." },
  { marker: "[ThumbnailsConvertor]", status: "Converting Thumbnail..." },
  { marker: "[EmbedThumbnail]", status: "Embedding Thumbnail..." },
  { marker: "[Metadata]", status: "Embedding Metadata..." },
  { marker: "[VideoConvertor]", status: "Converting Video..." },
];

/**
 * Detects a processing-stage status from a yt-dlp output line, if any.
 * @param {string} line
 * @returns {string|null}
 */
function detectStage(line) {
  for (const { marker, status } of STAGE_MARKERS) {
    if (line.includes(marker)) return status;
  }
  return null;
}

module.exports = { parseSizeToBytes, parseDownloadLine, detectStage };
