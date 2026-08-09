/*
 * 오늘 질문 수 — 입력창 아래 "오늘 n/N회 사용" 표시용.
 *
 * ⚠️ 진짜 한도 판정은 서버(/api/chat)가 Supabase RPC로 센다. 여기 값은
 * **이 기기에서 보낸 질문 수**일 뿐이라 서버 카운트와 어긋날 수 있다
 * (다른 기기·같은 IP의 다른 사용자는 잡히지 않는다).
 * 차단 여부를 이 값으로 판단하지 말 것 — 안내 문구 용도다.
 */

import { todayKey } from "@/lib/dailyStatus";

const KEY = () => `jjinjipsa:chatUsage:${todayKey()}`;

export function loadChatUsage(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(localStorage.getItem(KEY()));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function bumpChatUsage(): number {
  if (typeof window === "undefined") return 0;
  const next = loadChatUsage() + 1;
  localStorage.setItem(KEY(), String(next));
  return next;
}

/** 서버가 센 실카운트로 로컬 추정치를 덮어쓴다 — 다음 진입 때 시작값이 맞도록 */
export function syncChatUsage(serverCount: number): void {
  if (typeof window === "undefined") return;
  if (Number.isFinite(serverCount) && serverCount >= 0)
    localStorage.setItem(KEY(), String(serverCount));
}
