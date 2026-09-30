/**
 * Runs a yt-dlp download task, parses its output for live progress,
 * pushes updates into state/downloadState.js (which fans them out over SSE),
 * and resolves with the final generated file path.
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { YT_DLP_PATH, TEMP_PATH } = require("../utils/fileUtils");
const { buildVideoArgs, buildAudioArgs } = require("../utils/buildArgs");
const { findLatestGeneratedFile } = require("../utils/cleanup");
const { parseDownloadLine, detectStage } = require("../utils/parseProgress");
const { getDownload, updateDownload } = require("../state/downloadState");

/**
 * Runs yt-dlp for the given request, streaming progress into the download's
 * state record, and resolves with the generated file path.
 * @param {Object} options
 * @param {string} options.downloadId - Session id to push progress updates to.
 * @param {string} options.url
 * @param {"video"|"audio"} options.type
 * @param {string} [options.format]
 * @param {string} [options.quality]
 * @param {import("express").Request} options.req - used to detect client disconnect
 * @returns {Promise<string>} Absolute path to the generated file.
 */
function runDownload({ downloadId, url, type, format, quality, req, resume = false }) {
  const requestId = req?.requestId || downloadId || "unknown";

  return new Promise((resolve, reject) => {
    const outputDir = TEMP_PATH;
    const outputPath = path.join(outputDir, "%(title)s.%(ext)s");

    let args;
    if (type === "video") {
      args = buildVideoArgs(url, outputPath, format || "mp4", quality, resume);
    } else if (type === "audio") {
      args = buildAudioArgs(url, outputPath, format || "mp3", quality, resume);
    } else {
      return reject(new Error("Invalid type"));
    }

    let finalFilePath = null;
    let stderrBuffer = "";

    console.log(
      `[${requestId}] ${new Date().toISOString()} yt-dlp START ${YT_DLP_PATH} ${args.join(" ")}`,
    );

    const downloadProcess = spawn(YT_DLP_PATH, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    /**
     * Handles a chunk of stdout/stderr: extracts the destination path,
     * live progress (percent/speed/eta/size), and processing-stage markers,
     * pushing any progress/stage change into the shared download state.
     */
    const handleOutputChunk = (chunk) => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/).filter(Boolean);

      for (const line of lines) {
        const destinationMatch = line.match(/Destination: (.*)/);
        if (destinationMatch) {
          finalFilePath = destinationMatch[1].trim();
        }

        const progress = parseDownloadLine(line);
        if (progress) {
          updateDownload(downloadId, {
            status: "Downloading...",
            percent: progress.percent,
            progress: progress.percent,
            percentage: progress.percent,
            total: progress.total,
            totalSize: progress.total,
            downloaded: progress.downloaded,
            downloadedSize: progress.downloaded,
            speed: progress.speed,
            eta: progress.eta,
          });
          continue;
        }

        const stage = detectStage(line);
        if (stage) {
          updateDownload(downloadId, { status: stage });
        }
      }
    };

    downloadProcess.stdout.on("data", handleOutputChunk);
    downloadProcess.stderr.on("data", (data) => {
      const nextChunk = data.toString();
      stderrBuffer += nextChunk;
      if (stderrBuffer.length > 65536) {
        stderrBuffer = stderrBuffer.slice(-65536);
      }
      handleOutputChunk(data);
    });

    const onClientClose = () => {
      if (!downloadProcess.killed) {
        downloadProcess.kill("SIGKILL");
      }
    };
    if (req) req.on("close", onClientClose);

    updateDownload(downloadId, {
      processHandle: downloadProcess,
      paused: false,
      cancelled: false,
      retrying: false,
      outputTemplate: outputPath,
      startedAt: new Date().toISOString(),
      status: resume ? "Resuming..." : "Downloading...",
    });

    downloadProcess.on("error", (error) => {
      console.error("yt-dlp spawn failed:", error.message);
      const download = getDownload(downloadId);
      if (download?.cancelled || download?.paused) {
        return;
      }
      updateDownload(downloadId, {
        status: "Failed",
        error: "Unable to start yt-dlp",
      });
      reject(new Error("Unable to start yt-dlp"));
    });

    downloadProcess.on("close", (code) => {
      if (req) req.off("close", onClientClose);

      const download = getDownload(downloadId);
      if (download?.paused) {
        updateDownload(downloadId, {
          processHandle: null,
          status: "Paused",
          error: null,
        });
        return;
      }

      if (download?.processHandle) {
        updateDownload(downloadId, { processHandle: null });
      }

      console.log(
        `[${requestId}] ${new Date().toISOString()} yt-dlp FINISH code=${code}`,
      );

      if (download?.cancelled) {
        return;
      }

      if (code !== 0) {
        console.error("yt-dlp direct download failed:", stderrBuffer);
        updateDownload(downloadId, {
          status: "Failed",
          error: "Download generation failed",
        });
        return reject(new Error("Download generation failed"));
      }

      let resolvedFilePath = finalFilePath;

      if (!resolvedFilePath || !fs.existsSync(resolvedFilePath)) {
        const generatedFile = findLatestGeneratedFile(outputDir);
        if (generatedFile) {
          console.log("Found fallback generated file:", generatedFile);
          resolvedFilePath = generatedFile;
        }
      }

      if (!resolvedFilePath || !fs.existsSync(resolvedFilePath)) {
        console.error(
          "Direct download file missing after generation:",
          resolvedFilePath,
          stderrBuffer,
        );
        updateDownload(downloadId, {
          status: "Failed",
          error: "Unable to locate generated file",
        });
        return reject(new Error("Unable to locate generated file"));
      }

      const filename = path.basename(resolvedFilePath);
      updateDownload(downloadId, {
        status: "Completed",
        percent: 100,
        progress: 100,
        percentage: 100,
        completed: true,
        filePath: resolvedFilePath,
        outputPath: resolvedFilePath,
        filename,
      });

      resolve(resolvedFilePath);
    });
  });
}

module.exports = { runDownload };
