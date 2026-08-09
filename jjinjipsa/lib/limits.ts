/*
 * 이용 한도 단일 출처 (D-24 티어 게이팅).
 *
 * 값이 여러 파일에 흩어져 있으면 한쪽만 바뀌어 뚫린다.
 * 한도를 조정할 때는 여기만 고친다. 서버(/api/chat)도 같은 상수를 쓴다.
 *
 * | 티어              | 고양이 | 하루 질문 | 기록 보관        |
 * |-------------------|--------|-----------|------------------|
 * | 게스트 (비로그인) | 1마리  | 3개       | 이 기기에만      |
 * | 카카오 로그인     | 2마리  | 10개      | 계정에 보관      |
 * | 요금제 (준비 중)  | 추가   | -         | -                |
 *
 * 원칙:
 * - **등록 한도는 등록 시점에만 검사한다.** 이미 한도보다 많이 등록된 계정
 *   (게이팅 전 3마리 등록)의 기존 아이는 그대로 보고 상담할 수 있다 —
 *   한도를 줄였다고 집사의 고양이를 인질로 잡지 않는다.
 * - 유료 결제는 PG 직접 연동 금지(D-00) — 준비되면 Groble 링크로 안내한다.
 */

import { supabase } from "@/lib/supabase";
import { USE_SUPABASE } from "@/lib/storage";

export type Tier = "guest" | "member";

/** 게스트 (카카오 로그인 전) */
export const GUEST_MAX_CATS = 1;
export const GUEST_DAILY_QUESTIONS = 3;

/** 카카오 로그인 (무료) */
export const FREE_MAX_CATS = 2;
export const FREE_DAILY_QUESTIONS = 10;

/**
 * 현재 티어. localStorage 모드(개발·동기화 OFF)는 로그인 개념이 없어
 * member로 본다 — 게이팅은 운영(Supabase 모드)에서 의미가 있다.
 */
export async function getTier(): Promise<Tier> {
  if (!USE_SUPABASE) return "member";
  try {
    const { data } = await supabase.auth.getUser();
    return data.user && data.user.is_anonymous === false ? "member" : "guest";
  } catch {
    return "guest";
  }
}

export function maxCatsFor(tier: Tier): number {
  return tier === "member" ? FREE_MAX_CATS : GUEST_MAX_CATS;
}

/** 등록 한도 초과 시 안내 — 게스트에게는 다음 단계(로그인)를, 회원에게는 요금제 예고를 */
export function maxCatsMessage(tier: Tier): string {
  return tier === "member"
    ? `지금은 ${FREE_MAX_CATS}마리까지 등록할 수 있어요. 더 많은 아이는 요금제로 준비하고 있어요.`
    : `로그인 전에는 ${GUEST_MAX_CATS}마리만 등록할 수 있어요. 카카오로 로그인하면 ${FREE_MAX_CATS}마리까지 등록되고 기록도 계정에 보관돼요.`;
}
