/**
 * File cleanup and post-download-directory scanning helpers.
 */
const fs = require("fs");
const path = require("path");

/**
 * Deletes a file from disk if it exists. Used after serving downloads.
 * @param {string} filePath - Absolute path of the file to remove.
 */
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`${new Date().toISOString()} cleanup deleted ${filePath}`);
    }
  } catch (error) {
    console.error("Cleanup failed:", error.message);
  }
}

function cleanupDownloadArtifacts(download) {
  if (!download) return;

  if (download.filePath) {
    cleanupFile(download.filePath);
  }

  if (download.filename) {
    const tempDir = path.resolve(__dirname, "..", "temp");
    if (fs.existsSync(tempDir)) {
      const basename = path.basename(download.filename);
      const partialMatches = fs
        .readdirSync(tempDir)
        .filter((entry) => entry.includes(basename) || entry.endsWith(".part"));
      partialMatches.forEach((entry) => {
        cleanupFile(path.join(tempDir, entry));
      });
    }
  }
}

/**
 * Finds the most recently modified completed file in a directory.
 * Used as a fallback when yt-dlp does not expose the destination path.
 * Ignores yt-dlp partial/temp fragments.
 * @param {string} folderPath
 * @returns {string|null}
 */
function findLatestGeneratedFile(folderPath) {
  if (!fs.existsSync(folderPath)) return null;

  const files = fs
    .readdirSync(folderPath)
    .map((name) => {
      const fullPath = path.join(folderPath, name);
      const stat = fs.statSync(fullPath);

      return {
        name,
        fullPath,
        mtimeMs: stat.mtimeMs,
        isFile: stat.isFile(),
      };
    })
    .filter((file) => {
      if (!file.isFile) return false;

      // Ignore yt-dlp partial/temp fragments
      if (
        file.name.endsWith(".part") ||
        file.name.includes(".part-Frag") ||
        file.name.endsWith(".ytdl")
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files[0]?.fullPath || null;
}

module.exports = {
  cleanupFile,
  cleanupDownloadArtifacts,
  findLatestGeneratedFile,
};
