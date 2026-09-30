export const API_BASE =
  window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;

export const DOWNLOAD_OPTIONS = {
  audio: {
    formats: [
      { value: "m4a", label: "M4A (AAC)" },
      { value: "mp3", label: "MP3" },
      { value: "opus", label: "Opus" },
    ],
    qualities: ["best", "high", "medium", "low"],
  },
  video: {
    formats: [
      { value: "mp4", label: "MP4" },
      { value: "webm", label: "WebM" },
    ],
    qualities: ["best", "2160p", "1440p", "1080p", "720p", "480p", "360p"],
  },
};
