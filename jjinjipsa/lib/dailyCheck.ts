/*
 * F-15 오늘의 체크 — 하루 1문항으로 습관 베이스라인(평소값)을 쌓는다.
 * questionKey는 한국어 그대로 저장해 챗봇 프롬프트의 <habit_baseline>에서 바로 읽히게 한다.
 */

import type { Cat, TraitAnswer } from "./storage";

export interface DailyQuestion {
  key: string;
  question: (cat: Cat) => string;
  options: string[];
}

export const DAILY_QUESTIONS: DailyQuestion[] = [
  {
    key: "구토 빈도",
    question: (c) => `${c.name}는 평소 얼마나 자주 토하나요?`,
    options: ["거의 안 해요", "한 달에 1~2번", "일주일에 1~2번", "일주일에 3번 이상"],
  },
  {
    key: "음수 습관",
    question: (c) => `${c.name}는 평소 물을 어떻게 마시나요?`,
    options: ["자주 조금씩", "가끔 몰아서", "잘 안 마시는 편", "잘 모르겠어요"],
  },
  {
    key: "식욕 패턴",
    question: (c) => `${c.name}의 평소 식욕은 어떤가요?`,
    options: ["한 번에 싹 비워요", "조금씩 자주 먹어요", "남기는 편이에요", "들쑥날쑥해요"],
  },
  {
    key: "소변 횟수",
    question: (c) => `${c.name}는 하루에 감자(소변)를 몇 번 정도 만드나요?`,
    options: ["1~2번", "3~4번", "5번 이상", "잘 모르겠어요"],
  },
  {
    key: "대변 패턴",
    question: (c) => `${c.name}의 맛동산(대변)은 얼마나 규칙적인가요?`,
    options: ["하루 1번 규칙적", "하루 2번 이상", "이틀에 1번", "불규칙해요"],
  },
  {
    key: "그루밍",
    question: (c) => `${c.name}의 그루밍(털 핥기)은 어느 정도인가요?`,
    options: ["적당히 해요", "과하게 핥는 편", "거의 안 해요", "잘 모르겠어요"],
  },
  {
    key: "놀이 시간",
    question: (c) => `${c.name}와 하루에 얼마나 놀아주나요?`,
    options: ["거의 못 놀아요", "10분 이내", "10~30분", "30분 이상"],
  },
];

export function todayStr(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * 오늘 보여줄 문항 선택:
 * - 오늘 이미 답했으면 null (하루 1문항)
 * - 아직 안 답한 문항 우선, 전부 답했으면 가장 오래된 답부터 갱신
 */
export function pickTodayQuestion(
  traits: TraitAnswer[],
  now = new Date(),
): DailyQuestion | null {
  const today = todayStr(now);
  if (traits.some((t) => t.answeredOn === today)) return null;

  const latestByKey = new Map<string, string>();
  for (const t of traits) {
    const prev = latestByKey.get(t.questionKey);
    if (!prev || prev < t.answeredOn) latestByKey.set(t.questionKey, t.answeredOn);
  }

  const unanswered = DAILY_QUESTIONS.filter((q) => !latestByKey.has(q.key));
  if (unanswered.length > 0) return unanswered[0];

  // 전부 답함 → 가장 오래된 항목 재질문 (베이스라인 갱신)
  return [...DAILY_QUESTIONS].sort(
    (a, b) =>
      (latestByKey.get(a.key) ?? "").localeCompare(latestByKey.get(b.key) ?? ""),
  )[0];
}
