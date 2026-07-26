/*
 * 저장소 진입점 — UI는 여기의 `storage`만 import한다.
 * M3(T-16)에서 이 한 줄을 SupabaseAdapter로 바꾸는 것이 교체의 전부여야 한다.
 */

import { LocalStorageAdapter } from "./local";
import { SupabaseStorageAdapter } from "./supabase";
import type { StorageAdapter } from "./adapter";

/*
 * 저장소 선택 (T-16): NEXT_PUBLIC_USE_SUPABASE=1 이면 Supabase 동기화, 아니면 localStorage.
 *
 * **배포 환경(Vercel)에는 이미 1이 설정돼 있다 — 운영은 Supabase 동기화 모드다.**
 * 로컬 개발은 .env.local에 값이 없으면 localStorage로 떨어진다.
 * 문제가 생기면 Vercel 환경변수를 0으로 바꿔 즉시 롤백할 수 있고,
 * 이관은 로컬 원본을 지우지 않으므로 되돌려도 기록은 남는다 (D-16).
 */
/** 서버 동기화(계정에 기록 보관)가 켜져 있는가 — UI 문구도 이 값을 따른다 */
export const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === "1";

export const storage: StorageAdapter = USE_SUPABASE
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
