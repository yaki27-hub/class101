/*
 * 오늘의 케어 루틴 토글 (T-53) — 아이별·날짜별 localStorage.
 * 시안의 화면 안 더미 상태를 대체한다. 자정이 지나면 자연히 새 키가 되어 리셋된다.
 */

import { todayKey } from "@/lib/dailyStatus";
import { pushKv } from "@/lib/kvSync";
import { ROUTINES } from "@/lib/homeMood";

const key = (catId: string) => `jjinjipsa:routine:${catId}:${todayKey()}`;

export function loadRoutine(catId: string): boolean[] {
  if (typeof window === "undefined") return ROUTINES.map(() => false);
  try {
    const raw = JSON.parse(localStorage.getItem(key(catId)) || "[]") as boolean[];
    return ROUTINES.map((_, i) => raw[i] === true);
  } catch {
    return ROUTINES.map(() => false);
  }
}

export function saveRoutine(catId: string, done: boolean[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(key(catId), JSON.stringify(done));
    pushKv(key(catId)); // 계정 동기화 (lib/kvSync)
  }
}
