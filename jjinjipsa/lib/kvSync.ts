/*
 * localStorage ↔ Supabase user_kv 동기화 (마이그레이션 0007).
 *
 * 오늘 상태·케어 루틴·꼭 기억할 것은 localStorage가 원본이라 기기를 바꾸면
 * 비어 보였다 (QA 제보 #2). 구조를 바꾸는 대신 키-값을 그대로 미러링한다:
 * - 저장할 때: localStorage에 쓰고 서버에 upsert (실패해도 화면은 정상 — 다음 저장 때 재시도)
 * - 앱 시작할 때: 서버 값을 localStorage로 내려받는다 (탭 세션당 1회)
 *
 * 0007 미적용·비로그인·localStorage 모드에서는 조용히 아무것도 하지 않는다.
 */

import { supabase } from "@/lib/supabase";
import { USE_SUPABASE } from "@/lib/storage";

/** 동기화 대상 키 접두사 — 이 밖의 로컬 키(캐시·플래그)는 올리지 않는다 */
const SYNC_PREFIXES = [
  "jjinjipsa:daily:",
  "jjinjipsa:routine:",
  "jjinjipsa:healthnote:",
];

function syncable(key: string): boolean {
  return SYNC_PREFIXES.some((p) => key.startsWith(p));
}

/** localStorage의 현재 값을 서버로 올린다 (fire-and-forget) */
export function pushKv(key: string): void {
  if (!USE_SUPABASE || typeof window === "undefined" || !syncable(key)) return;
  const value = localStorage.getItem(key);
  if (value === null) return;
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from("user_kv").upsert({
        user_id: data.user.id,
        key,
        value,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // 다음 저장에서 다시 올라간다 — 화면 동작을 막지 않는다
    }
  })();
}

const HYDRATED_FLAG = "jjinjipsa:kvHydrated";

/**
 * 서버의 키-값을 localStorage로 내려받는다. 탭 세션당 1회.
 * 서버 값이 이 기기 값보다 우선한다 — 시작 시점엔 아직 입력 전이고,
 * 이 기기에서 저장한 값은 이미 서버에도 같은 값으로 올라가 있다.
 */
export async function hydrateKv(uid: string): Promise<void> {
  if (!USE_SUPABASE || typeof window === "undefined") return;
  // 계정이 바뀌면 다시 내려받아야 하므로 uid를 플래그에 포함한다
  if (sessionStorage.getItem(HYDRATED_FLAG) === uid) return;
  try {
    const { data, error } = await supabase.from("user_kv").select("key,value");
    if (error) return; // 0007 미적용 등 — 조용히 통과
    for (const row of data ?? []) {
      if (syncable(row.key)) localStorage.setItem(row.key, row.value);
    }
    sessionStorage.setItem(HYDRATED_FLAG, uid);
  } catch {
    /* 오프라인 등 — 다음 진입에 다시 시도 */
  }
}
