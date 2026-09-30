/**
 * Wraps yt-dlp invocations for metadata fetching (used by routes/info.js).
 */
const { spawn } = require("child_process");
const { YT_DLP_PATH } = require("../utils/fileUtils");

/**
 * Fetches title/thumbnail metadata for a URL without downloading.
 * @param {string} url
 * @returns {Promise<{title: string, thumbnail: string}>}
 */
function fetchInfo(url) {
  return new Promise((resolve, reject) => {
    const timeoutMs = Number.parseInt(
      process.env.INFO_TIMEOUT_MS || "15000",
      10,
    );
    const yt = spawn(YT_DLP_PATH, [
      "--skip-download",
      "--no-warnings",
      "--print",
      "%(title)s",
      "--print",
      "%(thumbnail)s",
      url,
    ]);

    let output = "";
    let settled = false;

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      callback();
    };

    const timeoutHandle = setTimeout(() => {
      if (!yt.killed) {
        yt.kill("SIGKILL");
      }
      finish(() => reject(new Error("Metadata lookup timed out")));
    }, timeoutMs);

    yt.stdout.on("data", (data) => {
      output += data.toString();
    });

    yt.stderr.on("data", () => {
      // Ignore yt-dlp stderr noise; the output already carries the metadata we need.
    });

    yt.on("close", (code) => {
      if (settled) return;
      const lines = output.trim().split(/\r?\n/).filter(Boolean);
      finish(() => {
        if (code !== 0) {
          reject(new Error("Metadata lookup failed"));
          return;
        }

        resolve({
          title: lines[0] || "Unknown Title",
          thumbnail: lines[1] || "",
        });
      });
    });

    yt.on("error", (error) => {
      finish(() => reject(error));
    });
  });
}

module.exports = { fetchInfo };
