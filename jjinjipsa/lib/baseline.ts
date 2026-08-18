/*
 * "오늘은 평소와 비교해서" 문장 엔진 (모카 프로토타입 이식).
 *
 * 오늘 상태 기록(식사·물·배변·활동)을 지난 기록과 비교해
 *   평소: 잘 먹었어요 (12/14일)
 *   오늘: 거의 안 먹었어요
 *   ⓘ 모카의 평소와 조금 달라요.
 * 를 만든다. **이 아이의 평소가 기준이다** — 만성적으로 적게 먹는 아이가
 * 오늘도 적게 먹었다면 "평소와 비슷해요"다. 일반 고양이 기준으로 판정하지 않는다.
 *
 * 정직성 규칙 (주간 리포트와 동일한 원칙):
 *  - 분모는 항상 "그 항목을 기록한 날"이다. 기록 안 한 날을 정상으로 세지 않는다
 *  - 표본이 MIN_BASELINE_DAYS 미만이면 비교하지 않는다 — "알아가는 중"이라고만 말한다
 *  - 오늘은 표본에서 뺀다 — 오늘의 이상값이 자기 기준을 오염시키면 비교가 무뎌진다
 *  - 다름의 방향(좋아짐/나빠짐)을 단정하지 않는다 — "조금 달라요"까지만.
 *    판단은 냥박사 상담과 수의사의 영역이다
 */

import {
  loadDailyOn,
  STATUS_ITEMS,
  type DailyRecord,
  type DailyStatusLevel,
  type DailyStatusType,
} from "@/lib/dailyStatus";

/** 평소를 말하려면 최소 며칠 표본이 필요한가 — 실사용을 보고 조정한다 */
export const MIN_BASELINE_DAYS = 5;
/** 얼마나 과거까지를 "요즘 평소"로 보나 (오늘 제외) */
export const LOOKBACK_DAYS = 28;

export type BaselineStatus =
  | "same" // 오늘이 평소 수준과 같다
  | "different" // 오늘이 평소 수준과 다르다 (방향은 말하지 않는다)
  | "learning"; // 표본 부족 — 아직 평소를 모른다

export interface BaselineItemView {
  key: DailyStatusType;
  icon: string;
  label: string;
  /** "평소: 잘 먹었어요 (12/14일)" — learning이면 null */
  baselineLine: string | null;
  /** "오늘: 거의 안 먹었어요" */
  todayLine: string;
  status: BaselineStatus;
  /** ⓘ 줄 — 상태별 한 문장 */
  note: string;
}

export interface BaselineCompare {
  /** 오늘 기록한 항목만 (unknown 제외). 기록 전 항목은 비교 대상이 아니다 */
  items: BaselineItemView[];
  /** 하나라도 평소와 다른가 — 홈 카드가 강조 여부를 정할 때 쓴다 */
  anyDifferent: boolean;
}

/** 배열에서 최빈값 — 동률이면 먼저 나온 것 (최근 날짜부터 넣으므로 최근 우선) */
function mode<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  const count = new Map<T, number>();
  let best: T = arr[0];
  let bestN = 0;
  for (const v of arr) {
    const n = (count.get(v) ?? 0) + 1;
    count.set(v, n);
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

/** 한 항목의 "요즘 평소" — 표본이 MIN 미만이어도 그대로 돌려준다 (판단은 호출부가) */
export interface ItemBaseline {
  /** unknown 제외, 오늘 제외한 표본 일수 */
  sampleDays: number;
  /** 최빈 수준 — 표본 0일이면 null */
  usualLevel: DailyStatusLevel | null;
  /** 최빈 수준에서 가장 자주 쓴 라벨 */
  usualLabel: string | null;
  /** 표본 중 최빈 수준이었던 날 수 */
  usualDays: number;
}

/** 지난 LOOKBACK_DAYS일(오늘 제외)에서 항목 하나의 평소를 집계한다 */
export function collectItemBaseline(
  catId: string,
  key: DailyStatusType,
  now: Date = new Date(),
): ItemBaseline {
  const levels: DailyStatusLevel[] = [];
  const labelsOfLevel = new Map<DailyStatusLevel, string[]>();
  for (let ago = 1; ago <= LOOKBACK_DAYS; ago++) {
    const d = new Date(now);
    d.setDate(d.getDate() - ago);
    const rec = loadDailyOn(catId, d)[key];
    if (!rec || rec.level === "unknown") continue;
    levels.push(rec.level);
    const list = labelsOfLevel.get(rec.level) ?? [];
    list.push(rec.label);
    labelsOfLevel.set(rec.level, list);
  }
  const usualLevel = mode(levels);
  return {
    sampleDays: levels.length,
    usualLevel,
    usualLabel: usualLevel ? mode(labelsOfLevel.get(usualLevel) ?? []) : null,
    usualDays: usualLevel ? levels.filter((l) => l === usualLevel).length : 0,
  };
}

/**
 * 오늘 기록을 이 아이의 "요즘 평소"와 비교한다.
 * today를 인자로 받는 이유: 홈은 이미 useTodayStatus로 오늘 기록을 들고 있고,
 * 저장 직후의 화면 상태와 어긋나지 않아야 한다.
 */
export function buildBaselineCompare(
  catId: string,
  today: DailyRecord,
  now: Date = new Date(),
): BaselineCompare {
  const items: BaselineItemView[] = [];

  for (const item of STATUS_ITEMS) {
    const t = today[item.key];
    // 오늘 기록 전이거나 "확인하지 못했어요"면 비교할 오늘이 없다 — 항목 자체를 뺀다
    if (!t || t.level === "unknown") continue;

    const base = collectItemBaseline(catId, item.key, now);
    const todayLine = `오늘: ${t.label}`;

    if (base.sampleDays < MIN_BASELINE_DAYS) {
      items.push({
        key: item.key,
        icon: item.icon,
        label: item.label,
        baselineLine: null,
        todayLine,
        status: "learning",
        note: `아직 ${item.label}의 평소를 알아가는 중이에요 (기록 ${base.sampleDays}일)`,
      });
      continue;
    }

    const same = t.level === base.usualLevel;

    items.push({
      key: item.key,
      icon: item.icon,
      label: item.label,
      baselineLine: `평소: ${base.usualLabel} (${base.usualDays}/${base.sampleDays}일)`,
      todayLine,
      status: same ? "same" : "different",
      note: same ? "평소와 비슷해요" : "평소와 조금 달라요",
    });
  }

  return { items, anyDifferent: items.some((i) => i.status === "different") };
}
