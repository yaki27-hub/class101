/*
 * 저장소 진입점 — UI는 여기의 `storage`만 import한다.
 * M3(T-16)에서 이 한 줄을 SupabaseAdapter로 바꾸는 것이 교체의 전부여야 한다.
 */

import { LocalStorageAdapter } from "./local";
import type { StorageAdapter } from "./adapter";

export const storage: StorageAdapter = new LocalStorageAdapter();

export * from "./types";
export type { StorageAdapter } from "./adapter";

/** 간단 id 생성 (Supabase 전환 시 uuid로 대체 가능) */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
