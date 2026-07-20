/*
 * 저장소 진입점 — UI는 여기의 `storage`만 import한다.
 * M3(T-16)에서 이 한 줄을 SupabaseAdapter로 바꾸는 것이 교체의 전부여야 한다.
 */

import { LocalStorageAdapter } from "./local";
import { SupabaseStorageAdapter } from "./supabase";
import type { StorageAdapter } from "./adapter";

/*
 * 저장소 선택 (T-16): NEXT_PUBLIC_USE_SUPABASE=1 이면 Supabase 동기화, 아니면 localStorage.
 * 검증 전까지 기본은 localStorage — 플래그로 안전하게 전환/롤백.
 */
export const storage: StorageAdapter =
  process.env.NEXT_PUBLIC_USE_SUPABASE === "1"
    ? new SupabaseStorageAdapter()
    : new LocalStorageAdapter();

export * from "./types";
export type { StorageAdapter } from "./adapter";

/** UUID 생성 — Supabase uuid 컬럼과 호환 */
export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 폴백 (구형 환경)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
