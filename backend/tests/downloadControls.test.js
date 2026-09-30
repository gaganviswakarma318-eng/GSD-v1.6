const test = require("node:test");
const assert = require("node:assert/strict");

const { createDownload, getDownload } = require("../state/downloadState");
const {
  pauseDownload,
  resumeDownload,
  cancelDownload,
  activeDownloads,
} = require("../services/downloadManager");

test("pauseDownload marks a running download as paused without removing it from active slots", () => {
  const id = "pause-test";
  createDownload(id, { status: "Downloading..." });
  const download = getDownload(id);
  download.processHandle = {
    killed: false,
    kill(signal) {
      this.killed = signal === "SIGKILL";
      return true;
    },
  };
  activeDownloads.add(id);

  const result = pauseDownload(id);

  assert.equal(result.ok, true);
  assert.equal(getDownload(id).status, "Paused");
  assert.equal(getDownload(id).paused, true);
  assert.ok(activeDownloads.has(id));
});

test("resumeDownload restores the active download state", () => {
  const id = "resume-test";
  createDownload(id, { status: "Paused", paused: true });
  const download = getDownload(id);
  download.processHandle = {
    killed: false,
    kill(signal) {
      this.killed = signal === "SIGKILL";
      return true;
    },
  };
  activeDownloads.add(id);

  const result = resumeDownload(id);

  assert.equal(result.ok, true);
  assert.equal(getDownload(id).status, "Downloading...");
  assert.equal(getDownload(id).paused, false);
});

test("cancelDownload removes the active slot and marks the session as cancelled", () => {
  const id = "cancel-test";
  createDownload(id, { status: "Downloading..." });
  const download = getDownload(id);
  download.processHandle = {
    killed: false,
    kill(signal) {
      this.killed = signal === "SIGKILL";
      return true;
    },
  };
  activeDownloads.add(id);

  const result = cancelDownload(id);

  assert.equal(result.ok, true);
  assert.equal(getDownload(id).status, "Cancelled");
  assert.equal(getDownload(id).cancelled, true);
  assert.ok(!activeDownloads.has(id));
});
