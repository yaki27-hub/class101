/*
 * 오늘 질문 수 — 입력창 아래 "오늘 n/N회 사용" 표시용.
 *
 * ⚠️ 진짜 한도 판정은 서버(/api/chat)가 Supabase RPC로 센다. 여기 값은
 * **이 기기에서 보낸 질문 수**일 뿐이라 서버 카운트와 어긋날 수 있다.
 * 서버가 헤더로 실카운트를 보내면 syncChatUsage로 덮어쓴다.
 *
 * 키는 사용자 scope별로 나눈다 — 게스트로 쓴 횟수가 로그인 계정 카운터에
 * 물려 들어오면 안 된다 (실사용 제보: 로그인 직후 "5/10"으로 시작).
 */

import { todayKey } from "@/lib/dailyStatus";

/** scope: 로그인 uid 앞 8자리, 게스트는 "guest" — 화면(chat page)이 정한다 */
const KEY = (scope: string) => `jjinjipsa:chatUsage:${scope}:${todayKey()}`;

export function loadChatUsage(scope = "guest"): number {
  if (typeof window === "undefined") return 0;
  const n = Number(localStorage.getItem(KEY(scope)));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function bumpChatUsage(scope = "guest"): number {
  if (typeof window === "undefined") return 0;
  const next = loadChatUsage(scope) + 1;
  localStorage.setItem(KEY(scope), String(next));
  return next;
}

/** 서버가 센 실카운트로 로컬 추정치를 덮어쓴다 — 다음 진입 때 시작값이 맞도록 */
export function syncChatUsage(serverCount: number, scope = "guest"): void {
  if (typeof window === "undefined") return;
  if (Number.isFinite(serverCount) && serverCount >= 0)
    localStorage.setItem(KEY(scope), String(serverCount));
}
