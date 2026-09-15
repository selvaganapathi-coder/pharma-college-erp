import type { AppState, CollectionKey } from "./types";
import { COLLECTION_KEYS } from "./types";

export function mergeCloud(local: AppState, cloud: Partial<AppState>, acceptEmpty: boolean): AppState {
  const next = { ...local };
  for (const key of COLLECTION_KEYS) {
    const rows = cloud[key];
    if (!Array.isArray(rows)) continue;
    if (rows.length > 0 || acceptEmpty) {
      (next[key] as AppState[CollectionKey]) = rows as AppState[CollectionKey];
    }
  }
  return next;
}
