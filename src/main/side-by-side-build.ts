import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDynamicRecord } from "@openbot/contracts/runtime-values";

// A side-by-side test build (`bun run dist:mac:side-by-side` or `dist:win:side-by-side`) installs
// next to the release app. electron-builder gives it its own app id and name, and writes
// `openbotSideBySide` into the packaged package.json. The main process then gives it its own data
// folder, Windows app id and icon, and leaves the openbot:// links to the release app.

export const SIDE_BY_SIDE_APP_NAME = "OpenBot Dev";
export const SIDE_BY_SIDE_APP_USER_MODEL_ID = "app.openbot.desktop.dev";

export function isSideBySideBuild(isPackaged: boolean, appPath: string): boolean {
  if (!isPackaged) return false;
  try {
    const metadata = JSON.parse(readFileSync(join(appPath, "package.json"), "utf8"));
    return isDynamicRecord(metadata) && metadata.openbotSideBySide === true;
  } catch {
    return false;
  }
}
