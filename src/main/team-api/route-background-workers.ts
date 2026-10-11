import {
  BACKGROUND_WORKERS_CAPABILITY,
  BACKGROUND_WORKERS_ROUTES,
} from "@openbot/contracts/team-protocol/background-workers-v1";
import type { TeamApiAgents } from "./dependencies";
import type { RouteOutcome, TeamApiRequestContext } from "./request-context";
import { readJson } from "./request-helpers";

/**
 * The ids of this computer's background workers, read from a joined server so that the client can
 * keep them out of its sidebar. Any member can read them, as any member can list the agents. A peer
 * that did not ask for the capability gets the same answer as for an unknown route. Frozen by
 * `background-workers-v1`.
 */
export async function routeBackgroundWorkers(
  context: TeamApiRequestContext,
  agents: Pick<TeamApiAgents, "listAgents">,
  hiddenAgentIds: ReadonlySet<string>,
): Promise<RouteOutcome> {
  const { method, url, capabilities, request, json } = context;
  if (
    method !== "POST" ||
    url.pathname !== BACKGROUND_WORKERS_ROUTES.list ||
    !capabilities.has(BACKGROUND_WORKERS_CAPABILITY)
  )
    return "unmatched";
  await readJson(request);
  const agentIds = agents
    .listAgents()
    .filter((agent) => agent.backgroundWorker === true && !hiddenAgentIds.has(agent.id))
    .map((agent) => agent.id);
  return json(200, { agentIds });
}
