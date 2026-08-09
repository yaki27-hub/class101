/*
 * 홈 "날씨돌" 무드 — 5종의 색·표정·카피를 한곳에 모은다.
 *
 * 시안(찐집사 홈 리디자인.dc.html)의 BASE 배열을 그대로 옮긴 것이다.
 * 레이아웃은 5무드 모두 같고, 여기 있는 값만 갈린다:
 *   무드 그라디언트 · 씬 일러스트 · 위트 멘트 · 스코어 · 3칩 · 냥박사 한마디.
 *
 * ⚠️ 이 파일의 수치는 전부 **정적 더미**다. 무드 판정·건강 점수·3칩 집계를
 * 실제 기록에서 뽑는 로직은 아직 없다 (docs 상 건강 점수는 한 번 걷어냈던 지표다).
 * 실제 데이터로 갈아끼울 때는 pickMood()만 바꾸면 화면은 손대지 않아도 된다.
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
      "이틀 연속 음수량이 낮아요. 습식 사료나 물그릇 추가를 먼저 시도해 보세요.",
      "음수 부족이 3일 이어지면 기록을 챙겨 병원에 문의하세요.",
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
      "24시간 안에 구토 2회 + 식사 거부는 병원 상담 기준이에요. 기록을 그대로 보여주세요.",
      "지금 기록을 챙겨 병원에 전화하세요. 냥박사가 요약본을 만들어 드려요.",
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

/** 케어 캘린더 11일치 — 시안과 동일 (더미) */
export const CALENDAR_RANGE = "12/13 – 12/23";
export const CALENDAR_DAYS: CalendarDay[] = [
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
  "일",
  "월",
  "화",
  "수",
  "목",
].map((dow, i) => {
  const n = 13 + i;
  return { dow, n, today: n === 20, logged: n <= 20 && n !== 16 };
});

/** 두근두근 냥 D-day — 시안과 동일 (더미) */
export const DDAY = {
  glyph: "💉",
  label: "두근두근 냥 D-day",
  title: "종합백신 3차 접종",
  badge: "D-7",
};

/** 카피 톤 — 시안 Tweaks의 "집사어 위트 강하게 / 담백하게" */
export type CopyTone = "witty" | "plain";
export const COPY_TONE: CopyTone = "witty";

export function witOf(m: Mood, tone: CopyTone = COPY_TONE): string {
  return tone === "witty" ? m.wit[0] : m.wit[1];
}

export function tipOf(m: Mood, tone: CopyTone = COPY_TONE): string {
  return tone === "witty" ? m.tip[0] : m.tip[1];
}
