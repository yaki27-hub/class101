/*
 * 체중 추이 판정 — 기록만 쌓는 게 아니라 **의미 있는 감소를 잡아내는 것**이 목적이다.
 *
 * 고양이는 체중 감소가 갑상선기능항진증·당뇨·만성 신부전·종양의 이른 신호로 나타난다.
 * 집사 눈에는 "좀 말랐나?" 정도라 놓치기 쉬운데, 숫자로 보면 분명해진다.
 *
 * ⚠️ 임계값은 **수의사 감수 전**이다. 아래 근거로 잡았고, 감수 시 함께 검토할 것.
 *   - 성묘에서 체중의 5% 이상 감소는 임상적으로 의미 있다고 보는 것이 일반적이다
 *   - 10% 이상이면 원인을 찾는 검사가 권장된다
 *   - 트리아지 기준표 §3(🟡)의 "눈에 띄는 체중 감소"를 수치로 옮긴 것
 * 살이 찌는 쪽도 비만(당뇨·관절 부담) 위험이라 함께 본다.
 * 다만 **아기 고양이는 크는 게 정상**이라 증가를 경고로 띄우지 않는다 (growing 옵션).
 * 감소는 아기 쪽이 더 위험하므로 단계와 무관하게 그대로 잡는다.
 */

import type { WeightLog } from "@/lib/storage";

export type WeightTrendLevel = "loss-high" | "loss" | "gain" | "stable" | "unknown";

export interface WeightTrend {
  level: WeightTrendLevel;
  /** 변화율 (%) — 음수면 감소 */
  changePct: number;
  /** 변화량 (kg) */
  changeKg: number;
  /** 비교에 쓴 기간 (일) */
  spanDays: number;
  latest: WeightLog | null;
  /** 집사에게 보여줄 한 줄 */
  message: string;
  /** 진료를 권해야 하는 수준인가 */
  needsVisit: boolean;
}

const EMPTY: WeightTrend = {
  level: "unknown",
  changePct: 0,
  changeKg: 0,
  spanDays: 0,
  latest: null,
  message: "체중을 두 번 이상 기록하면 추이를 보여드려요.",
  needsVisit: false,
};

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** 날짜순으로 정렬 (오래된 것 → 최신) */
export function sortWeights(logs: WeightLog[]): WeightLog[] {
  return [...logs].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

/**
 * 최신 기록을 기준으로 추이를 판정한다.
 *
 * 비교 대상은 **6개월 안쪽에서 가장 오래된 기록**이다.
 * 너무 옛날과 비교하면 성장기 변화까지 감소로 잡히고, 바로 직전과만 비교하면
 * 천천히 빠지는 경우를 놓친다.
 */
export function analyzeWeights(
  logs: WeightLog[],
  opts: { growing?: boolean } = {},
): WeightTrend {
  const sorted = sortWeights(logs);
  if (sorted.length === 0) return EMPTY;

  const latest = sorted[sorted.length - 1];
  if (sorted.length === 1) {
    return {
      ...EMPTY,
      latest,
      message: "한 번 더 기록하면 변화를 알려드려요.",
    };
  }

  // 6개월(약 180일) 안쪽에서 가장 오래된 기록을 기준점으로
  const within = sorted.filter((l) => daysBetween(l.measuredAt, latest.measuredAt) <= 180);
  const base = within.length >= 2 ? within[0] : sorted[sorted.length - 2];

  const changeKg = latest.weightKg - base.weightKg;
  const changePct = base.weightKg > 0 ? (changeKg / base.weightKg) * 100 : 0;
  const spanDays = daysBetween(base.measuredAt, latest.measuredAt);
  const abs = Math.abs(changePct);
  const kg = Math.abs(changeKg).toFixed(1);

  // 감소 — 안전상 더 민감하게 본다
  if (changePct <= -10) {
    return {
      level: "loss-high",
      changePct, changeKg, spanDays, latest,
      message: `${spanDays}일 사이 ${kg}kg(${abs.toFixed(0)}%) 줄었어요. 원인을 찾는 진료를 권해요.`,
      needsVisit: true,
    };
  }
  if (changePct <= -5) {
    return {
      level: "loss",
      changePct, changeKg, spanDays, latest,
      message: `${spanDays}일 사이 ${kg}kg(${abs.toFixed(0)}%) 줄었어요. 살펴볼 만한 변화예요.`,
      needsVisit: true,
    };
  }
  if (changePct >= 10) {
    // 아기 고양이는 늘어야 정상이다 — 경고 대신 그대로 알려준다
    if (opts.growing) {
      return {
        level: "stable",
        changePct, changeKg, spanDays, latest,
        message: `${spanDays}일 사이 ${kg}kg 늘었어요. 한창 클 나이라 자연스러운 변화예요.`,
        needsVisit: false,
      };
    }
    return {
      level: "gain",
      changePct, changeKg, spanDays, latest,
      message: `${spanDays}일 사이 ${kg}kg(${abs.toFixed(0)}%) 늘었어요. 급여량을 살펴봐 주세요.`,
      needsVisit: false,
    };
  }
  return {
    level: "stable",
    changePct, changeKg, spanDays, latest,
    message:
      abs < 1
        ? "체중이 안정적으로 유지되고 있어요."
        : `${spanDays}일 사이 ${kg}kg 변했어요. 정상 범위예요.`,
    needsVisit: false,
  };
}

/** 이번 달에 기록했는지 — 월 1회 입력 유도에 쓴다 */
export function hasThisMonthLog(logs: WeightLog[], now = new Date()): boolean {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return logs.some((l) => l.measuredAt.startsWith(ym));
}

export const TREND_STYLE: Record<WeightTrendLevel, { dot: string; text: string }> = {
  "loss-high": { dot: "bg-error", text: "text-error" },
  loss: { dot: "bg-warning", text: "text-secondary" },
  gain: { dot: "bg-warning", text: "text-secondary" },
  stable: { dot: "bg-success", text: "text-success" },
  unknown: { dot: "bg-hairline", text: "text-muted" },
};
