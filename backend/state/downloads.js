/**
 * Shared in-memory state for the download server.
 * progress    - text polled by the frontend via GET /progress
 * infoCache   - TTL-cached metadata keyed by URL (see services/cacheService.js)
 * downloadMap - reserved for tracking active/queued downloads
 */
const state = {
  progress: "",
  infoCache: {},
  downloadMap: {},
};

module.exports = state;
