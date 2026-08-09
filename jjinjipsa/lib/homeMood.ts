/*
 * 홈 "날씨돌" 무드 — 5종의 색·표정·카피를 한곳에 모은다.
 *
 * 시안(찐집사 홈 리디자인.dc.html)의 BASE 배열을 그대로 옮긴 것이다.
 * 레이아웃은 5무드 모두 같고, 여기 있는 값만 갈린다:
 *   무드 그라디언트 · 씬 일러스트 · 위트 멘트 · 스코어 · 3칩 · 냥박사 한마디.
 *
 * MOODS의 수치(score·sub·chip)는 **?mood= 미리보기 전용 더미**로만 남아 있다.
 * 실제 홈은 computeHome()이 오늘 상태 기록(식사·물·배변·활동)에서 무드·점수·칩을
 * 계산해 덮어쓴다 (T-53). 판정 규칙은 computeHome 주석 참고.
 */

export type MoodId = "sunny" | "cloudy" | "warning" | "sick" | "night";

export interface Mood {
  id: MoodId;
  /** 가이드 보드 토큰명 */
  token: string;
  /** 사람이 읽는 상태 이름 */
  name: string;
  /** 그라디언트 상단 */
  top: string;
  /** 그라디언트 하단 — 씬 스크림이 이 색으로 착지한다 */
  bottom: string;
  /** 냥박사 한마디 카드 배경 (가장 어두운 톤) */
  deep: string;
  /** 스코어 옆 글리프 */
  glyph: string;
  score: number;
  /** [위트 강하게, 담백하게] */
  wit: [string, string];
  sub: string;
  chipMeal: string;
  chipWater: string;
  chipLitter: string;
  /** 케어 루틴 3종의 초기 완료 상태 */
  routineDone: [boolean, boolean, boolean];
  tip: [string, string];
  /** 무드별 씬 일러스트 — 같은 방·같은 아이를 시간과 상태만 바꿔 그린 5장 */
  scene: string;
  /** 그 씬이 무엇을 그린 것인지 (발주 기준) */
  charNote: string;
}

export const MOODS: Mood[] = [
  {
    id: "sunny",
    token: "mood/sunny",
    name: "컨디션 최상",
    top: "#3DBB7E",
    bottom: "#0E5B41",
    deep: "#0A3D2B",
    glyph: "☀️",
    score: 92,
    wit: ["오늘 츄르각…! 컨디션 최상의 날", "오늘 츄르 두 개 각. 컨디션 만렙"],
    sub: "식사 2/3 · 활동 최고 · 음수 OK",
    chipMeal: "2/3",
    chipWater: "180ml",
    chipLitter: "3회",
    routineDone: [true, true, false],
    tip: [
      "이 컨디션 그대로 가려면 물그릇 위치를 밥그릇에서 떨어뜨려 두세요.",
      "컨디션 좋을 때 체중 한 번 재두면 나중에 비교가 쉬워요.",
    ],
    scene: "/scenes/sunny.webp",
    charNote: "햇살 든 창가 · 기지개",
  },
  {
    id: "cloudy",
    token: "mood/cloudy",
    name: "컨디션 보통",
    top: "#9AA6A8",
    bottom: "#4A5254",
    deep: "#333A3C",
    glyph: "☁️",
    score: 74,
    wit: ["그냥저냥… 평소랑 비슷한 하루", "오늘은 무난무난. 평소 그 고양이"],
    sub: "식사 2/3 · 활동 보통 · 음수 보통",
    chipMeal: "2/3",
    chipWater: "120ml",
    chipLitter: "2회",
    routineDone: [true, false, false],
    tip: [
      "평범한 날의 기록이 쌓여야 이상한 날이 눈에 띄어요. 오늘도 한 줄만.",
      "변화가 없다는 것도 좋은 데이터예요.",
    ],
    scene: "/scenes/cloudy.webp",
    charNote: "같은 방, 흐린 빛 · 웅크림",
  },
  {
    id: "warning",
    token: "mood/warning",
    name: "관찰 필요",
    top: "#E8813C",
    bottom: "#B04A1E",
    deep: "#7C3413",
    glyph: "🍂",
    score: 58,
    wit: ["음… 물그릇이 너무 조용한데요?", "오늘 물그릇 왜 이렇게 잠잠하죠…?"],
    sub: "식사 1/3 · 활동 저하 · 음수 부족",
    chipMeal: "1/3",
    chipWater: "45ml",
    chipLitter: "1회",
    routineDone: [false, false, false],
    tip: [
      "주의 신호가 보이는 날이에요. 물그릇·화장실·밥그릇을 한 번씩 더 살펴봐 주세요.",
      "이런 변화가 며칠 이어지면 기록을 챙겨 병원에 문의하세요.",
    ],
    scene: "/scenes/warning.webp",
    charNote: "빈 물그릇 클로즈업 · 노을빛",
  },
  {
    id: "sick",
    token: "mood/sick",
    name: "이상 신호",
    top: "#8FCACF",
    bottom: "#5A9AA3",
    deep: "#2F5F66",
    glyph: "🌧️",
    score: 41,
    wit: [
      "오늘은 좀 힘든가 봐요… 곁에 있어 주세요",
      "오늘은 많이 힘든 날. 옆에 있어 주세요",
    ],
    sub: "식사 0/3 · 구토 2회 · 활동 없음",
    chipMeal: "0/3",
    chipWater: "20ml",
    chipLitter: "0회",
    routineDone: [false, false, false],
    tip: [
      "이상 신호가 기록된 날이에요. 오늘 기록을 그대로 챙겨 병원 상담을 권해요.",
      "지금 기록을 챙겨 병원에 문의하세요. 냥박사에게 물어보면 정리도 도와드려요.",
    ],
    scene: "/scenes/sick.webp",
    charNote: "창밖 비 · 담요에 파묻힘",
  },
  {
    id: "night",
    token: "mood/night",
    name: "취침 · 야간",
    top: "#2C4BC4",
    bottom: "#12225E",
    deep: "#0C1743",
    glyph: "🌙",
    score: 88,
    wit: ["쌔근쌔근… 오늘 하루 수고했어요", "오늘 하루 잘 버텼다, 우리 둘 다"],
    sub: "오늘 기록 완료 · 내일 아침 급여 예약",
    chipMeal: "3/3",
    chipWater: "150ml",
    chipLitter: "2회",
    routineDone: [true, true, true],
    tip: [
      "자기 전 5분, 오늘 기록만 마저 채우면 내일 리포트가 정확해져요.",
      "밤에 우다다가 심하면 자기 전 사냥놀이 10분이 도움이 돼요.",
    ],
    scene: "/scenes/night.webp",
    charNote: "불 끈 방 · 달빛과 스탠드",
  },
];

/*
 * 씬 규격 — public/scenes/{무드id}.webp, 정사각 880×880.
 *
 * 히어로는 390×440으로 그려지므로 2배가 880이다. 원본(1254² PNG, 장당 2MB대)을
 * 그대로 넣으면 홈 첫 화면마다 몇 MB를 받게 된다. 새 씬을 갈아끼울 때도 같은 규격으로:
 *   npx sharp-cli -i <원본> -o public/scenes/<무드id>.webp resize 880 880 --fit cover
 *
 * 색보정(filter·soft-light tint)은 걷어냈다. 1장을 5무드로 돌려 쓰던 시절의 장치이고,
 * 무드마다 제 색을 가진 그림에 또 씌우면 의도한 색이 망가진다.
 */
export const SCENE_SIZE = 880;

export const DEFAULT_MOOD: MoodId = "sunny";

export function getMood(id: string | null | undefined): Mood {
  return MOODS.find((m) => m.id === id) ?? MOODS[0];
}

/**
 * 히어로 배경 — 씬 하단(440px)에서 정확히 무드 하단색에 도달시킨다.
 * 여기가 어긋나면 스크림이 착지하는 색과 배경색이 달라 이음매가 한 줄 생긴다.
 */
export function heroBg(m: Mood): string {
  return `linear-gradient(180deg, ${m.top} 0px, ${m.bottom} 440px, ${m.bottom} 100%)`;
}

/** 씬 위 스크림 — 아래로 갈수록 무드색에 녹아든다 */
export function heroScrim(m: Mood): string {
  return `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.12) 46%, ${m.bottom}CC 76%, ${m.bottom} 100%)`;
}

/** 케어 루틴 3종 — 시안과 동일 (더미) */
export const ROUTINES: { glyph: string; label: string }[] = [
  { glyph: "🪥", label: "양치" },
  { glyph: "🧶", label: "빗질" },
  { glyph: "🎣", label: "사냥놀이" },
];

export interface CalendarDay {
  dow: string;
  n: number;
  today: boolean;
  logged: boolean;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 케어 캘린더 11일치 — **실데이터**. 민트 점 = 그날 기록이 있음.
 * @param loggedDates 기록이 있는 날짜(yyyy-MM-dd) 집합 — 오늘 상태 + 증상 기록
 */
export function buildCalendar(
  loggedDates: Set<string>,
  now = new Date(),
): { days: CalendarDay[]; range: string } {
  const days: CalendarDay[] = [];
  for (let i = 10; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({
      dow: DOW[d.getDay()],
      n: d.getDate(),
      today: i === 0,
      logged: loggedDates.has(localKey(d)),
    });
  }
  const first = new Date(now);
  first.setDate(now.getDate() - 10);
  const range = `${first.getMonth() + 1}/${first.getDate()} – ${now.getMonth() + 1}/${now.getDate()}`;
  return { days, range };
}

/* ── 실데이터 무드 판정 (T-53) ─────────────────────────────── */

/** 칩에 들어가는 짧은 표현 — 기록 라벨을 그대로 넣으면 칩이 두 줄이 된다 */
const CHIP_SHORT: Record<string, string> = {
  "잘 먹었어요": "잘 먹음",
  "평소보다 적어요": "적음",
  "거의 안 먹었어요": "안 먹음",
  "평소와 같아요": "평소만큼",
  "평소보다 많이 마셨어요": "많음",
  "평소보다 적게 마셨어요": "적음",
  묽어요: "묽음",
  딱딱해요: "딱딱함",
  "평소보다 활발해요": "활발",
  "거의 움직이지 않아요": "거의 없음",
};

interface DailyEntry {
  level: "normal" | "warning" | "danger" | "unknown";
  label: string;
}
export interface HomeInput {
  /** 오늘 상태 기록 (식사·물·배변·활동) */
  record: Partial<Record<"meal" | "water" | "toilet" | "activity", DailyEntry>>;
  /** 체중 추이가 진료 권고 수준인가 (lib/weightTrend) */
  weightNeedsVisit: boolean;
  now?: Date;
}

export interface HomeView {
  mood: Mood;
  /** null = 아직 기록 전 (숫자 대신 "기록 전"을 보여준다) */
  score: number | null;
  wit: string;
  sub: string;
  chipMeal: string;
  chipWater: string;
  chipLitter: string;
}

/**
 * 오늘 상태 기록 → 무드·점수·칩.
 *
 * 판정 순서 — **아픈 신호가 시간대를 이긴다**:
 *   danger 항목 ≥1 → sick
 *   warning 항목 ≥1 또는 체중 진료 권고 → warning
 *   밤(21시~새벽 5시) → night
 *   그 외 → 점수 85 이상 sunny / 미만 cloudy
 *
 * 점수는 의학 지표가 아니라 **오늘 기록의 상태 요약**이다: 58 + 기록 항목×10
 * − 주의×14 − 이상×30 (15~99). 4항목 모두 정상이면 98, 기록 전이면 null.
 * 수의학적 건강 점수처럼 읽히지 않게, 기록이 없으면 숫자를 아예 보여주지 않는다.
 */
export function computeHome(input: HomeInput): HomeView {
  const now = input.now ?? new Date();
  const entries = (["meal", "water", "toilet", "activity"] as const)
    .map((k) => ({ key: k, e: input.record[k] }))
    .filter((x): x is { key: typeof x.key; e: DailyEntry } => !!x.e && x.e.level !== "unknown");

  const warn = entries.filter((x) => x.e.level === "warning").length;
  const danger = entries.filter((x) => x.e.level === "danger").length;
  const recorded = entries.length;

  const score =
    recorded === 0
      ? null
      : Math.max(15, Math.min(99, 58 + recorded * 10 - warn * 14 - danger * 30));

  const hour = now.getHours();
  const night = hour >= 21 || hour < 5;

  let id: MoodId;
  if (danger > 0) id = "sick";
  else if (warn > 0 || input.weightNeedsVisit) id = "warning";
  else if (night) id = "night";
  else if (score !== null && score >= 85) id = "sunny";
  else id = "cloudy";

  const mood = getMood(id);

  const chip = (k: "meal" | "water" | "toilet"): string => {
    const e = input.record[k];
    if (!e || e.level === "unknown") return "기록 전";
    return CHIP_SHORT[e.label] ?? e.label;
  };

  const ITEM_KO: Record<string, string> = {
    meal: "식사", water: "음수", toilet: "화장실", activity: "활동",
  };
  const sub =
    recorded === 0
      ? "기록을 남기면 오늘의 무드가 채워져요"
      : entries
          .slice(0, 3)
          .map((x) => `${ITEM_KO[x.key]} ${CHIP_SHORT[x.e.label] ?? x.e.label}`)
          .join(" · ") + (input.weightNeedsVisit ? " · 체중 살펴보기" : "");

  return {
    mood,
    score,
    wit: recorded === 0 ? "오늘은 어떤 하루였나요?" : witOf(mood),
    sub,
    chipMeal: chip("meal"),
    chipWater: chip("water"),
    chipLitter: chip("toilet"),
  };
}

/** ?mood= 미리보기 — 시안 더미 값 그대로 (개발·시연용) */
export function previewHome(mood: Mood): HomeView {
  return {
    mood,
    score: mood.score,
    wit: witOf(mood),
    sub: mood.sub,
    chipMeal: mood.chipMeal,
    chipWater: mood.chipWater,
    chipLitter: mood.chipLitter,
  };
}

/** 카피 톤 — 시안 Tweaks의 "집사어 위트 강하게 / 담백하게" */
export type CopyTone = "witty" | "plain";
export const COPY_TONE: CopyTone = "witty";

export function witOf(m: Mood, tone: CopyTone = COPY_TONE): string {
  return tone === "witty" ? m.wit[0] : m.wit[1];
}

export function tipOf(m: Mood, tone: CopyTone = COPY_TONE): string {
  return tone === "witty" ? m.tip[0] : m.tip[1];
}
