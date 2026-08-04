/*
 * 냥이 생활기록부 — 성격·재능 문항과 등급 (D-20).
 *
 * ⚠️ 여기 문항에는 **건강 지표를 절대 넣지 않는다.**
 * 등급을 매기는 칸이라서, 건강을 넣는 순간 아픈 아이는 F를 받게 된다.
 * 신부전 노묘를 키우는 집사가 자랑할 수 없는 카드는 만들지 않는다.
 * 건강 항목은 `lib/dailyCheck.ts`(습관 베이스라인)와 건강 카드가 따로 맡는다.
 *
 * 등급은 **우열이 아니라 성향**이다. D를 받아도 웃기고 귀여워야 한다.
 * 그래서 등급 옆에는 항상 캐릭터 한 줄(note)이 붙는다 — 등급만 보면 평가처럼
 * 읽히지만, 한 줄이 붙으면 묘사가 된다.
 *
 * 저장은 기존 TraitAnswer를 그대로 쓴다(새 테이블 없음). 다만 questionKey에
 * `성격:` 접두어를 붙여, 챗봇 프롬프트의 <habit_baseline>에서 걸러낸다.
 * 걸러내지 않으면 "사진 협조도: 도망가요"가 건강 판정의 근거로 들어간다.
 */

import type { Cat, TraitAnswer } from "./storage";

/** 성격 문항의 questionKey 접두어 — 건강 습관과 가르는 표식 */
export const PERSONALITY_PREFIX = "성격:";

export type Grade = "A+" | "A" | "B" | "C" | "D";

export interface PersonalityOption {
  label: string;
  grade: Grade;
  /** 등급 옆에 붙는 캐릭터 한 줄 */
  note: string;
}

export interface PersonalityQuestion {
  /** 기록부에 찍히는 항목명 */
  key: string;
  question: (cat: Cat) => string;
  options: PersonalityOption[];
  /** 총평 계산에 쓰는 축 */
  axis: "애교" | "활동" | "사교" | "식탐";
}

export const PERSONALITY_QUESTIONS: PersonalityQuestion[] = [
  {
    key: "사냥 실력",
    axis: "활동",
    question: (c) => `${c.name} 앞에서 낚싯대를 흔들면?`,
    options: [
      { label: "끝까지 쫓아가 잡아요", grade: "A+", note: "타고난 사냥꾼" },
      { label: "몇 번 하다 앉아버려요", grade: "B", note: "체력 안배형" },
      { label: "눈만 따라가요", grade: "C", note: "눈으로 하는 사냥" },
      { label: "관심 없어요", grade: "D", note: "사냥은 조상님 일" },
    ],
  },
  {
    key: "낯가림",
    axis: "사교",
    question: (c) => `손님이 오면 ${c.name}는?`,
    options: [
      { label: "먼저 다가가 냄새 맡아요", grade: "A+", note: "사교계 인싸" },
      { label: "멀리서 지켜봐요", grade: "B", note: "관찰 후 판단" },
      { label: "숨었다가 나중에 나와요", grade: "C", note: "신중파" },
      { label: "초인종만 울려도 침대 밑", grade: "D", note: "은둔 고수" },
    ],
  },
  {
    key: "무릎냥 지수",
    axis: "애교",
    question: (c) => `집사가 소파에 앉으면 ${c.name}는?`,
    options: [
      { label: "바로 무릎에 올라와요", grade: "A+", note: "직행 무릎냥" },
      { label: "옆자리에 붙어 앉아요", grade: "A", note: "적당한 거리의 미학" },
      { label: "같은 방에는 있어요", grade: "B", note: "존재만으로 충분" },
      { label: "혼자 있는 걸 좋아해요", grade: "C", note: "독립생활자" },
    ],
  },
  {
    key: "간식 반응속도",
    axis: "식탐",
    question: () => "츄르 봉지 뜯는 소리가 나면?",
    options: [
      { label: "0.1초 만에 나타나요", grade: "A+", note: "소리보다 빠름" },
      { label: "자다가도 일어나요", grade: "A", note: "간식 알람 내장" },
      { label: "천천히 걸어와요", grade: "B", note: "품위 유지" },
      { label: "별로 안 좋아해요", grade: "C", note: "간식보다 밥" },
    ],
  },
  {
    key: "수다력",
    axis: "사교",
    question: (c) => `${c.name}는 평소 말이 많은 편인가요?`,
    options: [
      { label: "쉴 새 없이 대답해요", grade: "A+", note: "말대꾸 전문" },
      { label: "부르면 대답해요", grade: "A", note: "예의 바른 대화형" },
      { label: "가끔 한마디", grade: "B", note: "말수 적은 편" },
      { label: "거의 안 울어요", grade: "C", note: "묵언수행 중" },
    ],
  },
  {
    key: "점프력",
    axis: "활동",
    question: (c) => `${c.name}가 올라가 본 가장 높은 곳은?`,
    options: [
      { label: "냉장고 위", grade: "A+", note: "정상 정복자" },
      { label: "책장·캣타워 꼭대기", grade: "A", note: "고소공포증 없음" },
      { label: "식탁이나 소파 정도", grade: "B", note: "적당한 높이 선호" },
      { label: "바닥이 제일 좋아요", grade: "C", note: "지상파" },
    ],
  },
  {
    key: "새벽 운동회",
    axis: "활동",
    question: (c) => `${c.name}의 새벽 우다다는?`,
    options: [
      { label: "매일 새벽 정해진 시간에", grade: "A+", note: "생체시계 정확" },
      { label: "가끔 몰아서 해요", grade: "A", note: "비정기 공연" },
      { label: "어릴 때만 했어요", grade: "B", note: "은퇴한 육상선수" },
      { label: "밤에 같이 자요", grade: "C", note: "집사 수면 수호자" },
    ],
  },
  {
    key: "상자 사랑",
    axis: "활동",
    question: () => "빈 상자를 바닥에 놓아두면?",
    options: [
      { label: "1초 만에 들어가요", grade: "A+", note: "상자는 곧 집" },
      { label: "한참 보다가 들어가요", grade: "A", note: "신중한 입주" },
      { label: "냄새만 맡고 가요", grade: "B", note: "간만 보는 중" },
      { label: "쳐다도 안 봐요", grade: "C", note: "상자에 관심 없음" },
    ],
  },
  {
    key: "집사 껌딱지",
    axis: "애교",
    question: (c) => `집사가 화장실에 가면 ${c.name}는?`,
    options: [
      { label: "문 앞에서 기다려요", grade: "A+", note: "24시간 경호원" },
      { label: "따라오다 말아요", grade: "A", note: "적당한 관심" },
      { label: "자던 자리 그대로", grade: "B", note: "쿨한 사이" },
      { label: "오히려 그때가 자유시간", grade: "C", note: "혼자가 편해요" },
    ],
  },
  {
    key: "손 탐",
    axis: "애교",
    question: (c) => `${c.name}를 쓰다듬으면?`,
    options: [
      { label: "골골거리며 더 해달래요", grade: "A+", note: "손길 중독" },
      { label: "잠깐은 좋아해요", grade: "A", note: "적정량이 존재함" },
      { label: "3초 뒤에 물어요", grade: "B", note: "3초의 법칙" },
      { label: "만지는 건 사양해요", grade: "C", note: "눈으로만 사랑" },
    ],
  },
  {
    key: "낮잠 자리",
    axis: "애교",
    question: (c) => `${c.name}는 주로 어디서 자나요?`,
    options: [
      { label: "집사 옆이나 배 위", grade: "A+", note: "체온 공유형" },
      { label: "햇빛 드는 창가", grade: "A", note: "태양 숭배자" },
      { label: "매번 다른 곳", grade: "B", note: "유목민" },
      { label: "아무도 모르는 곳", grade: "C", note: "비밀 요원" },
    ],
  },
  {
    key: "사진 협조도",
    axis: "사교",
    question: () => "카메라를 들이대면?",
    options: [
      { label: "포즈까지 잡아줘요", grade: "A+", note: "타고난 모델" },
      { label: "가만히는 있어요", grade: "A", note: "무보수 협조" },
      { label: "바로 고개를 돌려요", grade: "B", note: "초상권 주장" },
      { label: "그 순간 사라져요", grade: "D", note: "포착 불가" },
    ],
  },
];

export const TOTAL_QUESTIONS = PERSONALITY_QUESTIONS.length;

/** TraitAnswer에 저장할 키 (`성격:사냥 실력`) */
export function traitKey(questionKey: string): string {
  return PERSONALITY_PREFIX + questionKey;
}

/** 성격 문항인가 — 챗봇 프롬프트에서 건강 습관과 가르는 데 쓴다 */
export function isPersonalityKey(key: string): boolean {
  return key.startsWith(PERSONALITY_PREFIX);
}

export interface ReportRow {
  key: string;
  question: PersonalityQuestion;
  /** 아직 안 답한 항목이면 null */
  answered: { label: string; grade: Grade; note: string } | null;
}

/** 저장된 답을 기록부 12줄로 편다 (안 채운 칸도 자리를 지킨다) */
export function buildReport(traits: TraitAnswer[]): ReportRow[] {
  const latest = new Map<string, TraitAnswer>();
  for (const t of traits) {
    if (!isPersonalityKey(t.questionKey)) continue;
    const prev = latest.get(t.questionKey);
    if (!prev || prev.answeredOn <= t.answeredOn) latest.set(t.questionKey, t);
  }

  return PERSONALITY_QUESTIONS.map((q) => {
    const hit = latest.get(traitKey(q.key));
    const opt = hit ? q.options.find((o) => o.label === hit.answer) : undefined;
    return {
      key: q.key,
      question: q,
      answered: opt ? { label: opt.label, grade: opt.grade, note: opt.note } : null,
    };
  });
}

const GRADE_SCORE: Record<Grade, number> = { "A+": 4, A: 3, B: 2, C: 1, D: 0 };

/** 축별 평균 점수 (0~4). 답한 항목이 없는 축은 null */
function axisScores(rows: ReportRow[]): Record<string, number | null> {
  const sums: Record<string, { total: number; n: number }> = {};
  for (const r of rows) {
    if (!r.answered) continue;
    const a = (sums[r.question.axis] ??= { total: 0, n: 0 });
    a.total += GRADE_SCORE[r.answered.grade];
    a.n += 1;
  }
  const out: Record<string, number | null> = {};
  for (const axis of ["애교", "활동", "사교", "식탐"]) {
    const a = sums[axis];
    out[axis] = a && a.n > 0 ? a.total / a.n : null;
  }
  return out;
}

export interface ReportSummary {
  /** 채운 항목 수 */
  filled: number;
  /** 유형 한 줄 (없으면 빈 문자열) */
  type: string;
  /** 담임 의견 본문 */
  comment: string;
}

/*
 * 담임 의견 — 지금은 규칙으로 만든다.
 *
 * AI로 쓰면 훨씬 개인적이겠지만, 상담 한도(하루 10회)를 자랑에 쓰게 하면
 * 정작 아플 때 못 쓴다. 별도 한도를 붙이는 건 다음 단계로 미루고,
 * 먼저 등급 조합에서 캐릭터를 뽑아낸다.
 */
export function summarize(rows: ReportRow[], catName: string): ReportSummary {
  const filled = rows.filter((r) => r.answered).length;
  if (filled === 0) {
    return {
      filled,
      type: "",
      comment: `아직 ${catName}에 대해 아는 게 없어요. 아래 항목을 채우면 담임 의견을 써드릴게요.`,
    };
  }

  const s = axisScores(rows);
  const hi = (v: number | null) => v !== null && v >= 3;
  const lo = (v: number | null) => v !== null && v <= 1.5;

  let type = "";
  let body = "";

  if (hi(s["애교"]) && lo(s["사교"])) {
    type = "집사 앞에서만 사자";
    body = `밖에서는 조용한데 집사한테는 할 말 다 하는 타입이에요. 낯선 사람 앞에서 숨는 아이가 집사 옆에만 오면 달라진다는 건, 그만큼 이 집이 안전하다고 느낀다는 뜻이고요.`;
  } else if (hi(s["애교"]) && hi(s["사교"])) {
    type = "누구에게나 다정한 아이";
    body = `사람을 겁내지 않고 먼저 다가가는 성격이에요. 흔한 성격이 아니라서, 병원에서도 수월한 편일 거예요.`;
  } else if (lo(s["애교"]) && hi(s["활동"])) {
    type = "혼자 노는 법을 아는 아이";
    body = `붙어 있는 걸 좋아하진 않지만 혼자서도 잘 노는 타입이에요. 무심해 보여도 같은 공간에 있는 것 자체가 이 아이의 애정 표현입니다.`;
  } else if (hi(s["활동"]) && hi(s["애교"])) {
    type = "체력도 애교도 넘치는 아이";
    body = `잘 놀고 잘 붙는, 집사 입장에서는 손이 많이 가지만 그만큼 돌려받는 성격이에요.`;
  } else if (lo(s["활동"]) && lo(s["사교"])) {
    type = "조용한 걸 아는 아이";
    body = `소란스러운 걸 좋아하지 않는 성격이에요. 표현이 적을 뿐이지 애정이 없는 게 아니니, 이 아이의 속도를 존중해 주시면 돼요.`;
  } else if (hi(s["식탐"])) {
    type = "간식 앞에 장사 없음";
    body = `먹는 것에 진심인 타입이에요. 식욕이 좋은 건 다행이지만, 그만큼 살이 붙기도 쉬우니 간식 양은 눈으로 세어두시는 게 좋아요.`;
  } else {
    type = "균형 잡힌 아이";
    body = `어느 한쪽으로 치우치지 않은 성격이에요. 무난한 게 아니라, 상황에 맞게 자기 속도를 조절할 줄 안다는 뜻입니다.`;
  }

  const tail =
    filled >= TOTAL_QUESTIONS
      ? ` 12개 항목을 빠짐없이 적어주셨네요. 이만큼 알고 있는 집사, 흔하지 않습니다.`
      : ` (${filled}/${TOTAL_QUESTIONS}개 항목 기준이라 아직 예비 의견이에요.)`;

  return { filled, type, comment: body + tail };
}

/*
 * 등급 배지 색 — **우열이 아니라 구분**이다.
 * 진하기 순으로 깔면 색 자체가 "A가 좋고 D가 나쁘다"를 말해버린다.
 * 그래서 스티키노트 4색을 등급마다 하나씩 배정하고, 글자는 전부 잉크로 고정한다
 * (파스텔 위 잉크는 9.9~11.6:1이라 어느 칸에서도 읽힌다).
 */
export const GRADE_STYLE: Record<Grade, string> = {
  "A+": "bg-ink text-canvas",
  A: "bg-mint text-ink",
  B: "bg-sky text-ink",
  C: "bg-butter text-ink",
  D: "bg-soft-pink text-ink",
};
