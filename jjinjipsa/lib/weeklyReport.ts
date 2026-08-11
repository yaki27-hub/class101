/*
 * 주간 리포트 집계 (지시서 P1-1) — **새 데이터를 요구하지 않고 기존 기록만 재가공한다.**
 *
 * 이 화면의 존재 이유: P0가 만든 "매일 기록"이 사용자에게 돌아오는 첫 지점이다.
 * 그래서 계산 규칙 하나가 제품 신뢰를 좌우한다 —
 *
 *   **기록이 없는 날을 정상으로 세지 않는다** (지시서 '절대 하지 말 것' 4항).
 *   "평소 수준 6/7일"의 분모는 7일이 아니라 **그 항목을 기록한 날 수**다.
 *   기록 자체가 적으면 경향을 말하지 않고 "비교하기 어렵다"고 말한다.
 *
 * 냥박사 한마디는 규칙 기반이다. AI로 쓰면 더 개인적이겠지만 상담 한도(하루 10회)를
 * 리포트가 먹으면 정작 아플 때 못 쓴다 (T-39에서 별도 한도로 다룬다).
 */

import { loadDailyOn, STATUS_ITEMS, type DailyStatusType } from "@/lib/dailyStatus";
import { loadRoutineOn } from "@/lib/careRoutine";
import type { SymptomLog, WeightLog } from "@/lib/storage";

/** 집계 기간 — 오늘 포함 7일 */
export const WEEK_DAYS = 7;

/**
 * 리포트를 열어줄 최소 기록일 수 (지시서 P1-2: 상수화해 나중에 조정 가능하게).
 * 3일 — 이틀은 "이번 주"라고 부르기 민망하고, 5일은 초반 사용자가 영영 못 본다.
 */
export const MIN_RECORD_DAYS = 3;

/** 경향을 말해도 되는 최소 기록일 수 — 이 아래면 한마디에서 비교를 하지 않는다 */
const ENOUGH_DAYS = 4;

export interface WeeklyItemStat {
  key: DailyStatusType;
  label: string;
  /** 이 항목을 기록한 날 수 (분모) */
  recordedDays: number;
  /** 그중 평소 수준(normal)인 날 */
  normalDays: number;
  /** 그중 주의·이상인 날 */
  offDays: number;
}

export interface WeeklyReport {
  /** "8/4 – 8/10" */
  range: string;
  /** 하루라도 기록이 있는 날 수 */
  recordedDays: number;
  items: WeeklyItemStat[];
  /** 이번 주 증상 기록 — 태그별 횟수 (많은 순) */
  symptoms: Array<{ tag: string; count: number }>;
  /** 케어 루틴 실행 일수 (루틴 index 순) */
  care: Array<{ label: string; glyph: string; days: number }>;
  /** 이번 주 마지막 체중 + 직전 기록 (없으면 null) */
  weight: { latest: WeightLog; prev: WeightLog | null } | null;
  /** 냥박사 한마디 (2~3문장, 규칙 기반) */
  comment: string;
  /** 리포트를 보여줄 만큼 기록이 있는가 */
  enough: boolean;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mmdd(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 최근 7일(오늘 포함)의 날짜 — 오래된 순 */
function weekDates(now: Date): Date[] {
  const out: Date[] = [];
  for (let i = WEEK_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

export interface WeeklyInput {
  catId: string;
  catName: string;
  symptoms: SymptomLog[];
  weights: WeightLog[];
  now?: Date;
}

export function buildWeeklyReport(input: WeeklyInput): WeeklyReport {
  const now = input.now ?? new Date();
  const dates = weekDates(now);
  const fromKey = ymd(dates[0]);
  const toKey = ymd(dates[dates.length - 1]);

  // ── 오늘냥 상태 ──
  const stats: WeeklyItemStat[] = STATUS_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    recordedDays: 0,
    normalDays: 0,
    offDays: 0,
  }));
  let recordedDays = 0;
  for (const d of dates) {
    const rec = loadDailyOn(input.catId, d);
    let dayHasAny = false;
    for (const s of stats) {
      const v = rec[s.key];
      if (!v || v.level === "unknown") continue;
      dayHasAny = true;
      s.recordedDays++;
      if (v.level === "normal") s.normalDays++;
      else s.offDays++;
    }
    if (dayHasAny) recordedDays++;
  }

  // ── 증상 (이번 주에 일어난 것만) ──
  const tagCount = new Map<string, number>();
  for (const log of input.symptoms) {
    const day = log.occurredAt.slice(0, 10);
    if (day < fromKey || day > toKey) continue;
    for (const t of log.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const symptoms = [...tagCount.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  // ── 케어 루틴 ──
  const care = ROUTINE_META.map((r) => ({ ...r, days: 0 }));
  for (const d of dates) {
    const done = loadRoutineOn(input.catId, d);
    care.forEach((c, i) => {
      if (done[i]) c.days++;
    });
  }

  // ── 체중 (이번 주 마지막 측정 + 그 직전) ──
  const sorted = [...input.weights].sort((a, b) =>
    a.measuredAt < b.measuredAt ? -1 : 1,
  );
  const inWeekIdx = sorted.reduce(
    (acc, w, i) => (w.measuredAt >= fromKey && w.measuredAt <= toKey ? i : acc),
    -1,
  );
  const weight =
    inWeekIdx >= 0
      ? { latest: sorted[inWeekIdx], prev: inWeekIdx > 0 ? sorted[inWeekIdx - 1] : null }
      : null;

  const enough = recordedDays >= MIN_RECORD_DAYS;

  return {
    range: `${mmdd(dates[0])} – ${mmdd(dates[dates.length - 1])}`,
    recordedDays,
    items: stats,
    symptoms,
    care,
    weight,
    enough,
    comment: buildComment({
      catName: input.catName,
      recordedDays,
      items: stats,
      symptoms,
      weight,
    }),
  };
}

/** 케어 루틴 표시용 메타 — homeMood의 ROUTINES와 같은 순서를 쓴다 */
const ROUTINE_META = [
  { label: "양치", glyph: "🪥" },
  { label: "빗질", glyph: "🧶" },
  { label: "사냥놀이", glyph: "🎣" },
];

/*
 * 냥박사 한마디 — 기록에 있는 것만 말한다.
 *
 * 규칙:
 *  1. 기록이 적으면(4일 미만) 경향을 말하지 않는다. 이게 최우선이다.
 *  2. 이상 기록이 있으면 어느 항목인지 짚되, 원인을 추정하지 않는다.
 *  3. 증상 기록이 있으면 횟수만 말하고 "이후 괜찮아졌다"처럼 기록에 없는 결론을 붙이지 않는다.
 */
function buildComment(a: {
  catName: string;
  recordedDays: number;
  items: WeeklyItemStat[];
  symptoms: Array<{ tag: string; count: number }>;
  weight: { latest: WeightLog; prev: WeightLog | null } | null;
}): string {
  const { catName, recordedDays, items, symptoms } = a;

  if (recordedDays === 0) {
    return `이번 주에는 ${catName}의 기록이 아직 없어요. 하루 한 번만 남겨도 다음 주에는 비교할 거리가 생겨요.`;
  }
  if (recordedDays < ENOUGH_DAYS) {
    const s =
      symptoms.length > 0
        ? ` 다만 ${symptoms.map((x) => `${x.tag} ${x.count}회`).join(", ")} 기록은 남아 있어요.`
        : "";
    return `이번 주 기록이 ${recordedDays}일뿐이라 아직 경향을 비교하기 어려워요.${s} 며칠 더 쌓이면 변화가 보이기 시작해요.`;
  }

  const off = items.filter((i) => i.offDays > 0);
  const sentences: string[] = [];

  if (off.length === 0) {
    sentences.push(
      `기록된 ${recordedDays}일 동안 ${catName}는 식사·음수·배변·활동 모두 평소 수준으로 적혀 있어요.`,
    );
  } else {
    sentences.push(
      `기록된 ${recordedDays}일 중 ${off
        .map((i) => `${i.label} ${i.offDays}일`)
        .join(", ")}이 평소와 다르게 적혀 있어요.`,
    );
  }

  if (symptoms.length > 0) {
    sentences.push(
      `증상 기록은 ${symptoms.map((x) => `${x.tag} ${x.count}회`).join(", ")}였어요.`,
    );
  }

  // 체중은 같은 주에 두 번 이상 재는 일이 드물어 "변화"로 말하지 않는다 (P0 체중 규칙과 동일)
  if (a.weight) {
    sentences.push(
      `체중은 ${a.weight.latest.weightKg}kg(${a.weight.latest.measuredAt.slice(5).replace("-", "/")} 기준)으로 기록돼 있어요.`,
    );
  }

  return sentences.join(" ");
}
