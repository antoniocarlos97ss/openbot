import { isBoolean, isDynamicRecord } from "./runtime-values";

// The host choices for how agents work on a long task: progress updates in the chat, and background
// workers that keep the chat free.

/** As it is stored and as it crosses IPC. */
export interface ProgressUpdatePreference {
  /** Agents can post short checkpoints during a turn that works on a user message. */
  enabled: boolean;
  /** Agents can give a long task to a temporary worker, so their chat stays free while it runs. */
  backgroundWorkers: boolean;
}

/** Off, so an agent works and answers as every agent did before the settings existed. */
export const DEFAULT_PROGRESS_UPDATE_PREFERENCE: ProgressUpdatePreference = {
  enabled: false,
  backgroundWorkers: false,
};

/** The switch as main, the preload or a remote host sends it. Throws on any other shape. */
export function decodeProgressUpdatePreference(value: unknown): ProgressUpdatePreference {
  if (!isDynamicRecord(value) || !isBoolean(value.enabled) || !isBoolean(value.backgroundWorkers))
    throw new Error("Invalid progress update setting.");
  return { enabled: value.enabled, backgroundWorkers: value.backgroundWorkers };
}
