/**
 * Manages the global progress string that the frontend polls via GET /progress.
 */
const state = require("../state/downloads");

/**
 * Updates the global progress string.
 * @param {string} text - Progress text displayed by /progress.
 */
function sendProgress(text) {
  state.progress = text;
}

/**
 * Reads the current progress string.
 * @returns {string}
 */
function getProgress() {
  return state.progress;
}

module.exports = { sendProgress, getProgress };
