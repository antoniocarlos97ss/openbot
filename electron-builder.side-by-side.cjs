// A test build that installs next to the release app: `bun run dist:mac:side-by-side` or
// `bun run dist:win:side-by-side`. It has its own app id and name, no openbot:// scheme and no
// update feed, and `src/main/side-by-side-build.ts` gives it its own data folder.
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { parse } = require("yaml");

const release = parse(readFileSync(join(__dirname, "electron-builder.yml"), "utf8"));
const { protocols: _protocols, publish: _publish, ...config } = release;

module.exports = {
  ...config,
  appId: "app.openbot.desktop.dev",
  productName: "OpenBot Dev",
  // The Windows installer names its folder after the package, so the name differs from the release too.
  extraMetadata: { ...config.extraMetadata, name: "openbot-dev", openbotSideBySide: true },
  publish: null,
  // Unsigned: macOS asks the user to allow the app once, in System Settings > Privacy & Security.
  mac: { ...config.mac, identity: null, notarize: false },
  directories: { ...config.directories, output: "dist-side-by-side" },
};
