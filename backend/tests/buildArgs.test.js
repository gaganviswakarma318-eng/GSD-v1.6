const test = require("node:test");
const assert = require("node:assert/strict");

const { buildVideoArgs, buildAudioArgs } = require("../utils/buildArgs");

test("video args prefer mp4-compatible streams and enable fragment concurrency", () => {
  const args = buildVideoArgs(
    "https://example.com/watch",
    "/tmp/out.%(ext)s",
    "mp4",
    "1080p",
  );
  const joined = args.join(" ");

  assert.ok(args.includes("--concurrent-fragments"));
  assert.ok(args.includes("4"));
  assert.match(
    joined,
    /bestvideo\[height<=1080\]\[ext=mp4\]\+bestaudio\[ext=m4a\]/,
  );
});

test("audio args skip transcoding when the requested format is already compatible", () => {
  const args = buildAudioArgs(
    "https://example.com/watch",
    "/tmp/out.%(ext)s",
    "m4a",
    "best",
  );

  assert.ok(args.includes("--concurrent-fragments"));
  assert.ok(!args.includes("-x"));
  assert.ok(args.includes("--audio-format"));
  assert.ok(args.some((value) => value.includes("bestaudio[ext=m4a]")));
});
