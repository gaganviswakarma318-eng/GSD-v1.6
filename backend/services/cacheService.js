/**
 * TTL-based cache for video/audio metadata, keyed by URL.
 */
const state = require("../state/downloads");

const TTL = 1000 * 60 * 60 * 6; // 6 hours

/**
 * Returns cached metadata for a URL if present and not expired.
 * @param {string} url
 * @returns {Object|null}
 */
function getCached(url) {
  const cache = state.infoCache[url];
  if (cache && Date.now() - cache.timestamp < TTL) {
    return cache.data;
  }
  return null;
}

/**
 * Stores metadata for a URL with the current timestamp.
 * @param {string} url
 * @param {Object} data
 */
function setCached(url, data) {
  state.infoCache[url] = {
    data,
    timestamp: Date.now(),
  };
}

module.exports = { getCached, setCached };
