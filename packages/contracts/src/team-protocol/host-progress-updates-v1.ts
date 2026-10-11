// Frozen optional host-progress-updates-v1 wire contract.
//
// What it grants, recorded here because freezing it makes it permanent: an owner or admin of a
// server can read and change two switches of the host: whether its agents can show short progress
// updates in the chat while they work on a user message, and whether they can give a long task to a
// temporary background worker. The switches are the same ones that the host user changes in the
// server settings of the host. A member cannot use either route; `requireAdmin`
// on the host is the only gate. Both routes answer with the switch as the host holds it after the
// request. Widening any of it needs a second capability string.
import { adminRoute, boolean, empty, fields, type OptionalRouteCodec } from "./admin-wire";

export const HOST_PROGRESS_UPDATES_CAPABILITY = "host-progress-updates-v1";

export const HOST_PROGRESS_UPDATES_ROUTES = {
  settings: "/v1/admin/host/progress-updates",
  update: "/v1/admin/host/progress-updates/update",
} as const;

const settings = fields({ enabled: boolean, backgroundWorkers: boolean });

export const HOST_PROGRESS_UPDATES_CODECS: ReadonlyMap<string, OptionalRouteCodec> = new Map([
  [HOST_PROGRESS_UPDATES_ROUTES.settings, adminRoute(empty, settings)],
  [HOST_PROGRESS_UPDATES_ROUTES.update, adminRoute(settings, settings)],
]);
