/*
 * 나이 환산 + 생애 단계 (F-02)
 * - 사람 나이: 수의학 통용 환산 (1년≈15세, 2년≈24세, 이후 +4세/년, 구간 내 선형 보간)
 * - 생애 단계: AAFP 구분 기반 5단계 (kitten <1 / junior 1~2 / adult 3~6 / mature 7~10 / senior 11+)
 */

import type { LifeStage } from "./storage";

export interface CatAgeInfo {
  /** 만 나이 (소수, 년) */
  years: number;
  /** "3살 4개월" 형태 */
  ageLabel: string;
  humanAge: number;
  stage: LifeStage;
  stageLabel: string;
  stageEmoji: string;
  /** 결과 화면 한 줄 메시지 */
  stageMessage: string;
  /** 생애 시계 진행률 0~1 (기대 수명 20년 기준) */
  clockRatio: number;
  /** 균등 5단계 바에서의 마커 위치 0~1 (현재 단계 + 단계 내 진행도) */
  markerRatio: number;
}

/** 단계별 [시작년, 끝년, 순서] — 균등 바 마커 계산용 */
const STAGE_BOUNDS: Record<LifeStage, [number, number, number]> = {
  kitten: [0, 1, 0],
  junior: [1, 3, 1],
  adult: [3, 7, 2],
  mature: [7, 11, 3],
  senior: [11, 20, 4],
};

const STAGES: Record<
  LifeStage,
  { label: string; emoji: string; message: string }
> = {
  kitten: {
    label: "아기 고양이",
    emoji: "🍼",
    message: "폭풍 성장기 — 사회화와 첫 접종 스케줄이 가장 중요해요.",
  },
  junior: {
    label: "주니어",
    emoji: "🧶",
    message: "에너지 최고치 — 놀이 습관과 식사량 기준을 잡아둘 때예요.",
  },
  adult: {
    label: "청년기",
    emoji: "😼",
    message: "가장 안정적인 시기 — 지금의 습관 기록이 평생 기준값이 돼요.",
  },
  mature: {
    label: "중년기",
    emoji: "🫖",
    message: "중년의 문턱 — 신장·치아 같은 조용한 변화를 챙기기 시작할 때예요.",
  },
  senior: {
    label: "시니어",
    emoji: "🌙",
    message: "느긋한 황혼기 — 반년마다 검진으로 변화를 일찍 잡는 게 최고의 선물이에요.",
  },
};

export function getCatAge(birthDate: string, now = new Date()): CatAgeInfo {
  const birth = new Date(`${birthDate}T00:00:00`);
  const ms = now.getTime() - birth.getTime();
  const years = Math.max(0, ms / (365.25 * 24 * 3600 * 1000));

  const wholeYears = Math.floor(years);
  const months = Math.floor((years - wholeYears) * 12);
  const ageLabel =
    wholeYears === 0 ? `${months}개월` : `${wholeYears}살 ${months}개월`;

  let human: number;
  if (years <= 1) human = years * 15;
  else if (years <= 2) human = 15 + (years - 1) * 9;
  else human = 24 + (years - 2) * 4;

  let stage: LifeStage;
  if (years < 1) stage = "kitten";
  else if (years < 3) stage = "junior";
  else if (years < 7) stage = "adult";
  else if (years < 11) stage = "mature";
  else stage = "senior";

  const meta = STAGES[stage];
  const [from, to, idx] = STAGE_BOUNDS[stage];
  const progress = Math.min(1, Math.max(0, (years - from) / (to - from)));
  return {
    years,
    ageLabel,
    humanAge: Math.round(human),
    stage,
    stageLabel: meta.label,
    stageEmoji: meta.emoji,
    stageMessage: meta.message,
    clockRatio: Math.min(1, years / 20),
    markerRatio: (idx + progress) / 5,
  };
}

/** 생애 시계 세그먼트 (시각화용) — [단계, 시작년, 끝년] */
export const CLOCK_SEGMENTS: Array<{
  stage: LifeStage;
  label: string;
  from: number;
  to: number;
}> = [
  { stage: "kitten", label: "아기", from: 0, to: 1 },
  { stage: "junior", label: "주니어", from: 1, to: 3 },
  { stage: "adult", label: "청년", from: 3, to: 7 },
  { stage: "mature", label: "중년", from: 7, to: 11 },
  { stage: "senior", label: "시니어", from: 11, to: 20 },
];
