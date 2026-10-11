import { isBoolean } from "@openbot/contracts/runtime-values";
import {
  HOST_PROGRESS_UPDATES_CAPABILITY,
  HOST_PROGRESS_UPDATES_ROUTES,
} from "@openbot/contracts/team-protocol/host-progress-updates-v1";
import { sourceText } from "@openbot/i18n/source";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { TeamApiAdmin } from "./dependencies";
import { HttpError } from "./http-error";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { readJson, requireAdmin } from "./request-helpers";

/**
 * The progress update and background worker switches of this computer, read and changed from a joined server. The change
 * runs as the local one does. Frozen by `host-progress-updates-v1`.
 */
export async function routeHostProgressUpdates(
  context: TeamApiRequestContext,
  admin: TeamApiAdmin | undefined,
): Promise<RouteOutcome> {
  const { method, url, capabilities, member, request, json } = context;
  if (
    method !== "POST" ||
    (url.pathname !== HOST_PROGRESS_UPDATES_ROUTES.settings && url.pathname !== HOST_PROGRESS_UPDATES_ROUTES.update)
  )
    return "unmatched";
  const progressUpdates = admin?.progressUpdates;
  if (!progressUpdates || !capabilities.has(HOST_PROGRESS_UPDATES_CAPABILITY))
    throw new HttpError(400, sourceText("error.team.progressUpdatesUnsupported"));
  requireAdmin(member);
  const body = await readJson(request);
  if (url.pathname === HOST_PROGRESS_UPDATES_ROUTES.settings) return json(200, progressUpdates.get());
  if (!isBoolean(body.enabled) || !isBoolean(body.backgroundWorkers))
    throw new HttpError(400, "enabled and backgroundWorkers must be true or false.");
  return json(
    200,
    await runCauseEffect(progressUpdates.set({ enabled: body.enabled, backgroundWorkers: body.backgroundWorkers })),
  );
}
