/*
 * 개체 지칭 감지 (지시서 P0-1) — "달씨 상담창에서 로마 이야기"를 잡는다.
 *
 * 달씨 창에서 "로마 비만일까?"라고 물었는데 달씨 체중으로 답하는 것은
 * "기록을 기억한다"는 약속을 정면으로 깨는 버그다. 전송 전에 질문 속
 * 다른 아이의 이름·별명을 찾아, 있으면 확인을 거친다.
 *
 * 매칭은 보수적으로 한다:
 * - 이름·별명이 **2글자 이상**일 때만 본다. 한 글자는 오탐이 너무 많다
 *   ("달"이 "달라졌어요"에 매칭되는 식).
 * - 현재 아이의 이름·별명도 함께 등장하면 두 아이를 비교하는 질문일 수
 *   있으므로, 그래도 확인을 띄운다 (다른 아이가 언급된 것은 사실이므로).
 */

import type { Cat } from "@/lib/storage";

/** 이 고양이를 부르는 모든 표현 (이름 + 별명, 2글자 이상만) */
function callSigns(cat: Cat): string[] {
  return [cat.name, ...(cat.aliases ?? [])]
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

/**
 * 질문이 현재 아이가 아닌 다른 아이를 지칭하는지 찾는다.
 * @returns 지칭된 다른 고양이 (없으면 null)
 */
export function detectOtherCatMention(
  text: string,
  cats: Cat[],
  currentCatId: string,
): Cat | null {
  for (const cat of cats) {
    if (cat.id === currentCatId) continue;
    if (callSigns(cat).some((sign) => text.includes(sign))) return cat;
  }
  return null;
}
