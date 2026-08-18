/*
 * "어제 이야기했던 것" 후속 질문 (모카 프로토타입) — 어제 증상 기록이 있으면
 * 오늘 어떤지 한 번 물어서 기록의 흐름을 잇는다.
 *
 * 답은 **새 증상 기록으로 저장하지 않는다.** "다시 평소 같아요"를 구토 태그
 * 기록으로 남기면 주간 리포트의 구토 횟수가 하나 늘어난다 — 회복이 재발로
 * 집계되는 것. 답 자체는 로컬에만 남겨 같은 기록에 다시 묻지 않게 하고,
 * 실제 데이터는 답이 이끄는 행동(오늘 상태 기록·냥박사 상담·새 증상 기록)이
 * 각자의 자리에서 만든다.
 *
 * 어제 것만 묻는다 — 사흘 전 기록을 오늘 물으면 "오늘은 어떤가요"의 '오늘'이
 * 이미 흐려져 있고, 그 사이 흐름은 주간 리포트가 맡는다.
 */

import type { SymptomLog } from "@/lib/storage";
import { todayKey } from "@/lib/dailyStatus";

export type FollowupAnswer = "normal" | "still" | "new";

export interface FollowupPrompt {
  logId: string;
  tags: string[];
  /** "어제 구토 기록이 있었어요. 오늘 모카는 어떤가요?" */
  question: string;
}

/** "모카는 / 봄은" — 받침 유무로 은·는을 고른다 */
function withTopicJosa(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 > 0;
  return `${word}${hasBatchim ? "은" : "는"}`;
}

/**
 * 어제 기록된 증상 로그에서 후속 질문을 만든다. 없으면 null.
 * @param answeredLogId 이미 답한 로그 — 같은 기록에 두 번 묻지 않는다
 */
export function buildFollowup(
  catName: string,
  logs: SymptomLog[],
  answeredLogId: string | null,
  now: Date = new Date(),
): FollowupPrompt | null {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = todayKey(yesterday);

  // 어제 발생한 기록 중 가장 최근 것 (occurredAt은 ISO — 로컬 날짜로 비교)
  const yLogs = logs.filter((l) => todayKey(new Date(l.occurredAt)) === yKey);
  if (yLogs.length === 0) return null;
  const latest = yLogs.reduce((a, b) => (a.occurredAt >= b.occurredAt ? a : b));
  if (answeredLogId === latest.id) return null;

  return {
    logId: latest.id,
    tags: latest.tags,
    question: `어제 ${latest.tags.join("·")} 기록이 있었어요. 오늘 ${withTopicJosa(catName)} 어떤가요?`,
  };
}

/* ── 답 저장 — 같은 기록에 다시 묻지 않기 위한 로컬 표시 ── */

const key = (catId: string) => `jjinjipsa:followupAns:${catId}`;

export function loadFollowupAnswer(
  catId: string,
): { logId: string; answer: FollowupAnswer; answeredOn: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(catId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFollowupAnswer(
  catId: string,
  logId: string,
  answer: FollowupAnswer,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      key(catId),
      JSON.stringify({ logId, answer, answeredOn: todayKey() }),
    );
  } catch {
    /* 저장 못 하면 내일 한 번 더 물을 뿐이다 */
  }
}
