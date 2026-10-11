import { DEFAULT_PROGRESS_UPDATE_PREFERENCE, type ProgressUpdatePreference } from "@openbot/contracts/ipc";
import { isBoolean, isDynamicRecord } from "@openbot/contracts/runtime-values";
import { Effect, Result, Semaphore } from "effect";
import { isMissingFileError } from "../backend/file-errors";
import { type PreferenceFileFailure, readPreferenceFile, writePreferenceFile } from "./preference-file";

/**
 * Whether agents can show progress updates in the chat while they work, and whether they can start
 * background workers. The backend reads it for each session start and each tool call, so it is held
 * in memory after `load`.
 *
 * A file that is missing, unreadable as JSON or without a switch reads as the default, off. Writes
 * are chained for the reason `update-preference-store.ts` chains its own: an earlier rename that
 * lands last would persist the value the user just changed.
 */
/** The switch as main uses it: a change also restarts the agents' sessions, so they get the new instructions. */
export interface ProgressUpdateSettings {
  get(): ProgressUpdatePreference;
  set(preference: ProgressUpdatePreference): Effect.Effect<ProgressUpdatePreference, PreferenceFileFailure>;
}

export class ProgressUpdatePreferenceStore {
  readonly #path: string;
  #preference: ProgressUpdatePreference = { ...DEFAULT_PROGRESS_UPDATE_PREFERENCE };
  #writes = Semaphore.makeUnsafe(1);

  constructor(path: string) {
    this.#path = path;
  }

  load(): Effect.Effect<void, PreferenceFileFailure> {
    return Effect.gen({ self: this }, function* () {
      const loaded = yield* Effect.result(
        readPreferenceFile(this.#path, (parsed): ProgressUpdatePreference | null =>
          isDynamicRecord(parsed) && parsed.version === 1 && isBoolean(parsed.enabled)
            ? { enabled: parsed.enabled, backgroundWorkers: parsed.backgroundWorkers === true }
            : null,
        ),
      );
      if (Result.isSuccess(loaded)) {
        if (loaded.success) this.#preference = loaded.success;
      } else if (!isMissingFileError(loaded.failure.cause) && !(loaded.failure.cause instanceof SyntaxError))
        return yield* loaded.failure;
    });
  }

  get(): ProgressUpdatePreference {
    return { ...this.#preference };
  }

  readonly set = Effect.fn("ProgressUpdatePreference.set")(function* (
    this: ProgressUpdatePreferenceStore,
    { enabled, backgroundWorkers }: ProgressUpdatePreference,
  ) {
    yield* this.#writes.withPermit(
      Effect.uninterruptible(
        writePreferenceFile(this.#path, { version: 1, enabled, backgroundWorkers }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              this.#preference = { enabled, backgroundWorkers };
            }),
          ),
        ),
      ),
    );
    return this.get();
  });
}
