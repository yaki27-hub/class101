/*
 * 오늘의 케어 루틴 토글 (T-53) — 아이별·날짜별 localStorage.
 * 시안의 화면 안 더미 상태를 대체한다. 자정이 지나면 자연히 새 키가 되어 리셋된다.
 */

import { todayKey } from "@/lib/dailyStatus";
import { pushKv } from "@/lib/kvSync";
import { ROUTINES } from "@/lib/homeMood";

const key = (catId: string) => `jjinjipsa:routine:${catId}:${todayKey()}`;
const keyOn = (catId: string, day: Date) =>
  `jjinjipsa:routine:${catId}:${todayKey(day)}`;

function read(storageKey: string): boolean[] {
  if (typeof window === "undefined") return ROUTINES.map(() => false);
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "[]") as boolean[];
    return ROUTINES.map((_, i) => raw[i] === true);
  } catch {
    return ROUTINES.map(() => false);
  }
}

export function loadRoutine(catId: string): boolean[] {
  return read(key(catId));
}

/** 특정 날짜의 루틴 (주간 리포트·연속 기록 집계용) */
export function loadRoutineOn(catId: string, day: Date): boolean[] {
  return read(keyOn(catId, day));
}

/**
 * 양치 연속 일수 (지시서 P1-3) — 오늘부터 거꾸로 세되, **오늘은 아직 안 했어도**
 * 어제까지의 연속은 살아 있다. 자정을 넘겼다고 어제까지 쌓은 기록이 0이 되면
 * 사용자가 화를 낼 만하고, 실제로도 아직 끊긴 게 아니다.
 * 초기 버전은 양치(index 0)에만 적용한다 — 루틴 3종에 한꺼번에 붙이지 않는다.
 */
export function brushStreak(catId: string, now = new Date()): number {
  if (typeof window === "undefined") return 0;
  let streak = 0;
  // i=0(오늘)은 아직 안 했을 수 있으므로, 오늘이 false면 어제부터 센다
  const todayDone = loadRoutineOn(catId, now)[0] === true;
  for (let i = todayDone ? 0 : 1; i < 400; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (loadRoutineOn(catId, d)[0] !== true) break;
    streak++;
  }
  return streak;
}

/** 축하할 만한 지점 — 넘겼는지가 아니라 정확히 그날일 때만 알린다 */
export const BRUSH_MILESTONES = [7, 15, 30];

export function saveRoutine(catId: string, done: boolean[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(key(catId), JSON.stringify(done));
    pushKv(key(catId)); // 계정 동기화 (lib/kvSync)
  }
}
