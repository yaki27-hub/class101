/*
 * 오늘 상태 기록 (홈 UX 개편) — 식사·물·배변·활동을 레벨(정상/주의/위험/미확인)로 기록.
 * 기존 건강 점수(care 토글)를 대체한다. 저장은 localStorage(로컬 날짜 기준).
 * ⚠️ 날짜 키는 로컬 시간 기준 — 한국 사용자 자정 경계 오류 방지 (UTC 사용 금지).
 */

export type DailyStatusType = "meal" | "water" | "toilet" | "activity";
export type DailyStatusLevel = "normal" | "warning" | "danger" | "unknown";

export interface StatusOption {
  label: string;
  level: DailyStatusLevel;
}

export interface StatusItem {
  key: DailyStatusType;
  label: string;
  /** 임시 이모지 아이콘 — 디자인 단계에서 라인 아이콘으로 교체 예정 */
  icon: string;
  sheetTitle: string;
  options: StatusOption[];
}

export const STATUS_ITEMS: StatusItem[] = [
  {
    key: "meal",
    label: "식사",
    icon: "🍚",
    sheetTitle: "오늘 식사량은 어땠나요?",
    options: [
      { label: "잘 먹었어요", level: "normal" },
      { label: "평소보다 적어요", level: "warning" },
      { label: "거의 안 먹었어요", level: "danger" },
      { label: "기록하지 않음", level: "unknown" },
    ],
  },
  {
    key: "water",
    label: "물",
    icon: "💧",
    sheetTitle: "오늘 물 섭취는 어땠나요?",
    options: [
      { label: "평소와 같아요", level: "normal" },
      { label: "평소보다 많이 마셨어요", level: "warning" },
      { label: "평소보다 적게 마셨어요", level: "warning" },
      { label: "확인하지 못했어요", level: "unknown" },
    ],
  },
  {
    key: "toilet",
    label: "배변",
    icon: "🚽",
    sheetTitle: "오늘 배변 상태는 어땠나요?",
    options: [
      { label: "평소와 같아요", level: "normal" },
      { label: "묽어요", level: "warning" },
      { label: "딱딱해요", level: "warning" },
      { label: "아직 못 봤어요", level: "unknown" },
    ],
  },
  {
    key: "activity",
    label: "활동",
    icon: "🧶",
    sheetTitle: "오늘 활동량은 어땠나요?",
    options: [
      { label: "평소와 같아요", level: "normal" },
      { label: "평소보다 활발해요", level: "normal" },
      { label: "평소보다 적어요", level: "warning" },
      { label: "거의 움직이지 않아요", level: "danger" },
    ],
  },
];

export type DailyRecord = Partial<
  Record<DailyStatusType, { level: DailyStatusLevel; label: string }>
>;

/** 로컬(KST 등) 기준 오늘 날짜 yyyy-MM-dd — UTC 경계 오류 방지 */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function storeKey(catId: string): string {
  return `jjinjipsa:daily:${catId}:${todayKey()}`;
}

export function loadDaily(catId: string): DailyRecord {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(storeKey(catId)) || "{}") as DailyRecord;
  } catch {
    return {};
  }
}

export function saveDaily(
  catId: string,
  type: DailyStatusType,
  level: DailyStatusLevel,
  label: string,
): DailyRecord {
  const next: DailyRecord = { ...loadDaily(catId), [type]: { level, label } };
  if (typeof window !== "undefined") {
    localStorage.setItem(storeKey(catId), JSON.stringify(next));
  }
  return next;
}

export type DailyState = "empty" | "partial" | "normal" | "abnormal";

export interface DailySummary {
  recordedCount: number; // 실제 기록(미확인 제외)
  totalCount: number;
  abnormalItems: StatusItem[]; // warning·danger
  state: DailyState;
}

const RECORDED = (l?: DailyStatusLevel) =>
  l === "normal" || l === "warning" || l === "danger";

export function summarize(record: DailyRecord): DailySummary {
  const abnormalItems = STATUS_ITEMS.filter((it) => {
    const l = record[it.key]?.level;
    return l === "warning" || l === "danger";
  });
  const recordedCount = STATUS_ITEMS.filter((it) =>
    RECORDED(record[it.key]?.level),
  ).length;

  let state: DailyState;
  if (recordedCount === 0) state = "empty";
  else if (abnormalItems.length > 0) state = "abnormal";
  else if (recordedCount === STATUS_ITEMS.length) state = "normal";
  else state = "partial";

  return {
    recordedCount,
    totalCount: STATUS_ITEMS.length,
    abnormalItems,
    state,
  };
}

/** 이상 항목을 자연스러운 한 문장으로 (냥박사 상담 초기 문맥용) */
export function abnormalSentence(record: DailyRecord): string {
  const parts = STATUS_ITEMS.filter((it) => {
    const l = record[it.key]?.level;
    return l === "warning" || l === "danger";
  }).map((it) => `${it.label}은(는) '${record[it.key]!.label}'`);
  if (parts.length === 0) return "";
  return `오늘 ${parts.join(", ")} 상태예요. 평소와 비교해서 봐줄 수 있어요?`;
}
