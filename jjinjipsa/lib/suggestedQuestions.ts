/*
 * 추천 질문 칩 (F-03'/F-08) — 프로필(생애 단계·품종·조건·체중) 기반 3개.
 * 빈 입력창의 막막함을 없애 첫 대화 성공률을 올리는 장치 (명세 §4).
 */

import { getCatAge } from "./catAge";
import type { Cat } from "./storage";

const STAGE_QUESTIONS: Record<string, string> = {
  kitten: "아기 고양이 첫 접종, 뭐부터 챙겨야 해요?",
  junior: "이 시기에 꼭 들여야 할 습관이 있을까요?",
  adult: "건강검진은 얼마나 자주 받아야 해요?",
  mature: "7살부터 챙겨야 할 검진은 뭐가 있어요?",
  senior: "시니어 케어에서 제일 중요한 게 뭐예요?",
};

const CONDITION_QUESTIONS: Record<string, string> = {
  신장: "신장이 약한 아이, 물을 더 마시게 하는 방법이 있을까요?",
  "요로 · 방광": "화장실에서 봐야 할 이상 신호가 있을까요?",
  비만: "다이어트는 어떻게 시작해야 안전해요?",
  "알레르기 · 피부": "사료를 바꿀 때 주의할 점이 있을까요?",
  치아: "양치 습관은 어떻게 들여요?",
  심장: "심장이 약한 아이는 놀이 시간을 조절해야 하나요?",
};

export function getSuggestedQuestions(cat: Cat): string[] {
  const age = getCatAge(cat.birthDate);
  const out: string[] = [];

  // 1) 생애 단계 질문
  out.push(STAGE_QUESTIONS[age.stage]);

  // 2) 기저조건 질문 (최대 2개)
  for (const c of cat.conditions) {
    const q = CONDITION_QUESTIONS[c];
    if (q && out.length < 3) out.push(q);
  }

  // 3) 채우기: 체중 기반 급여량 → 일반 질문
  if (out.length < 3 && cat.weightKg)
    out.push(`${cat.name}(${cat.weightKg}kg) 하루 사료량은 얼마가 적당해요?`);
  if (out.length < 3) out.push("간식은 하루에 얼마나 줘도 괜찮아요?");
  if (out.length < 3) out.push("물은 하루에 얼마나 마셔야 정상이에요?");

  return out.slice(0, 3);
}
