import { readFile } from "node:fs/promises";
import { isDynamicRecord, isString } from "@openbot/contracts/runtime-values";
import { Effect, Semaphore } from "effect";
import { writeJsonFileAtomically } from "../atomic-json-file";
import { isMissingFileError } from "../file-errors";
import { StoredStateFailure } from "../stored-state-effects";

/** The most workers one agent can have at the same time. */
export const BACKGROUND_WORKER_LIMIT = 4;

/** One temporary agent that works on one task for another agent. */
export interface BackgroundWorker {
  agentId: string;
  requesterAgentId: string;
  /** The task message that the requester sent. The worker's result answers it. */
  taskMessageId: string;
  /** The tool call that started the worker, so a retried call starts no second worker. */
  idempotencyKey: string;
}

interface StoredWorkers {
  version: 1;
  workers: BackgroundWorker[];
}

function isWorker(value: unknown): value is BackgroundWorker {
  return (
    isDynamicRecord(value) &&
    isString(value.agentId) &&
    isString(value.requesterAgentId) &&
    isString(value.taskMessageId) &&
    isString(value.idempotencyKey)
  );
}

/**
 * The agents that are temporary background workers. The record survives a restart, so a worker that
 * a restart stopped is still removed when its work ends. A file that is missing or invalid reads as
 * no workers: each worker is then an ordinary agent that the user can remove. Without a path, the
 * record stays in memory.
 */
export class BackgroundWorkers {
  readonly #path: string | null;
  #workers: BackgroundWorker[] = [];
  readonly #writes = Semaphore.makeUnsafe(1);

  constructor(path: string | null) {
    this.#path = path;
  }

  readonly load = Effect.fn("BackgroundWorkers.load")(function* (this: BackgroundWorkers) {
    const path = this.#path;
    if (!path) return;
    const text = yield* Effect.tryPromise({
      try: () => readFile(path, "utf8"),
      catch: (cause) => new StoredStateFailure({ cause }),
    }).pipe(
      Effect.catch((failure) => (isMissingFileError(failure.cause) ? Effect.succeed(null) : Effect.fail(failure))),
    );
    if (text === null) return;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return;
    }
    if (isDynamicRecord(parsed) && parsed.version === 1 && Array.isArray(parsed.workers))
      this.#workers = parsed.workers.filter(isWorker);
  });

  list(): readonly BackgroundWorker[] {
    return this.#workers;
  }

  find(agentId: string): BackgroundWorker | undefined {
    return this.#workers.find((worker) => worker.agentId === agentId);
  }

  findByKey(idempotencyKey: string): BackgroundWorker | undefined {
    return this.#workers.find((worker) => worker.idempotencyKey === idempotencyKey);
  }

  countFor(requesterAgentId: string): number {
    return this.#workers.filter((worker) => worker.requesterAgentId === requesterAgentId).length;
  }

  add(worker: BackgroundWorker): Effect.Effect<void, StoredStateFailure> {
    return this.#save([...this.#workers.filter((entry) => entry.agentId !== worker.agentId), worker]);
  }

  remove(agentId: string): Effect.Effect<void, StoredStateFailure> {
    if (!this.find(agentId)) return Effect.void;
    return this.#save(this.#workers.filter((worker) => worker.agentId !== agentId));
  }

  removeByKey(idempotencyKey: string): Effect.Effect<void, StoredStateFailure> {
    const worker = this.findByKey(idempotencyKey);
    return worker ? this.remove(worker.agentId) : Effect.void;
  }

  #save(workers: BackgroundWorker[]): Effect.Effect<void, StoredStateFailure> {
    const path = this.#path;
    const write: Effect.Effect<void, StoredStateFailure> = path
      ? writeJsonFileAtomically<StoredWorkers>(path, { version: 1, workers }).pipe(
          Effect.mapError((failure) => new StoredStateFailure({ cause: failure.cause })),
        )
      : Effect.void;
    return this.#writes.withPermit(
      Effect.uninterruptible(write.pipe(Effect.tap(() => Effect.sync(() => (this.#workers = workers))))),
    );
  }
}

/** The task as the worker reads it: the requester's words, then what a worker is and how it ends. */
export function backgroundTaskText(requester: { id: string; name: string }, task: string): string {
  return [
    task,
    `You are a temporary background worker that ${requester.name} (agent id ${requester.id}) started for this one task. Work on it alone. Ask the user only when you cannot continue.`,
    `Your final answer is the result. OpenBot sends it to ${requester.name}, then removes you and your workspace. To give files, call openbot.send_message to ${requester.name} with their paths, this message id as replyToMessageId and expectsReply false. That message is then your result.`,
  ].join("\n\n");
}
