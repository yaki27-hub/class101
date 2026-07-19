/*
 * 증상 태그 감지 (F-05 / 명세 §5-2) — 유저 발화에서 증상성 키워드를 태그로 추출.
 * 대화 종료 시 "기록으로 남길까요?" 제안의 발동 조건이자 자동 태그의 원천.
 */

const TAG_PATTERNS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "구토", patterns: [/구토/, /토했/, /토해/, /토하/, /게웠/, /게워/] },
  { tag: "설사", patterns: [/설사/, /무른\s*변/, /묽은\s*변/] },
  {
    tag: "식욕 변화",
    patterns: [/(밥|사료|간식).{0,8}(안|못)\s*먹/, /식욕/, /입맛/],
  },
  {
    tag: "음수 변화",
    patterns: [/물.{0,8}(많이|자주|부쩍|안|못)\s*마/, /음수량?/],
  },
  {
    tag: "화장실 이상",
    patterns: [/소변|오줌|감자/, /혈뇨/, /화장실.{0,10}(자주|들락|실수)/],
  },
  { tag: "배변 이상", patterns: [/변비/, /대변|맛동산/, /혈변/] },
  { tag: "호흡기", patterns: [/기침/, /재채기/, /콧물/, /숨소리/, /호흡/] },
  {
    tag: "피부 · 털",
    patterns: [/피부/, /털.{0,4}빠/, /탈모/, /가려워/, /긁/, /각질|비듬/],
  },
  { tag: "눈 · 귀", patterns: [/눈곱/, /눈물/, /눈이?\s*(붓|충혈|뿌옇)/, /귀지/, /귀를?\s*(긁|털)/] },
  { tag: "무기력", patterns: [/무기력/, /기운.{0,4}없/, /축\s*(처|늘어)/, /숨어\s*있/] },
  { tag: "체중 변화", patterns: [/체중/, /몸무게/, /살이?\s*(빠|쪘|찜)/] },
  { tag: "통증 의심", patterns: [/아파/, /아픈\s*것/, /만지면\s*(싫|울|하악)/, /절뚝/] },
];

export function extractSymptomTags(text: string): string[] {
  const tags: string[] = [];
  for (const { tag, patterns } of TAG_PATTERNS) {
    if (patterns.some((p) => p.test(text))) tags.push(tag);
  }
  return tags;
}
