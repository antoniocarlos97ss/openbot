// Frozen optional background-workers-v1 wire contract.
//
// What it grants, recorded here because freezing it makes it permanent: every authenticated member
// of a server can read the ids of the host's agents that are temporary background workers, so a
// connected client can keep their rows out of its sidebar. The route only reads; the worker agents
// stay ordinary agents in every other route. Widening any of it needs a second capability string.
import { adminRoute, empty, fields, identifier, list, type OptionalRouteCodec } from "./admin-wire";

export const BACKGROUND_WORKERS_CAPABILITY = "background-workers-v1";

export const BACKGROUND_WORKERS_ROUTES = {
  list: "/v1/host/background-workers",
} as const;

/** More than four workers for each agent of a large host. */
const MAX_WORKERS = 1_000;

export const BACKGROUND_WORKERS_CODECS: ReadonlyMap<string, OptionalRouteCodec> = new Map([
  [BACKGROUND_WORKERS_ROUTES.list, adminRoute(empty, fields({ agentIds: list(identifier, MAX_WORKERS) }))],
]);
