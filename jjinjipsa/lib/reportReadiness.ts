/*
 * 생활기록부 준비 상태 (지시서 P2-2) — 언제 "준비됐어요"를 띄울지, 초안을 뽑을 재료가
 * 있는지 판정한다.
 *
 * 두 가지를 **분리해서** 본다. 하나로 합치면 거짓말이 되기 때문이다:
 *
 *  1. `ready` — 기록이 쌓였는가. "달이의 생활기록부가 준비됐어요"를 띄울 조건.
 *  2. `evidence` — 초안을 만들 **근거 문장**이 있는가.
 *
 * 기록은 많은데 집사가 쓴 문장이 없으면 초안은 한 줄도 못 만든다. 그런데 ready만 보고
 * "준비됐어요"를 띄우면, 눌러 들어간 집사는 빈 화면을 본다. 그래서 화면은 두 값을
 * 따로 말한다.
 *
 * **앱을 오래 썼다는 사실만으로는 열리지 않는다** (지시서 P2-2). 가입일이 아니라
 * 실제 기록 일수와 문장 수만 본다.
 */

/** 진입 조건 — 오늘 상태를 기록한 날 (최근 30일 안에서) */
export const MIN_RECORD_DAYS = 10;
/** 진입 조건(대안) — 집사가 남긴 문장 수. 기록은 적어도 이야기를 많이 한 경우 */
export const MIN_TEXTS_FOR_READY = 8;
/** 초안을 시도할 최소 근거 문장 수 */
export const MIN_TEXTS_FOR_DRAFT = 3;
/** 근거로 훑는 기간 */
export const LOOKBACK_DAYS = 30;

export interface ReadinessInput {
  /** 최근 30일 중 오늘 상태를 기록한 날 수 */
  recordDays: number;
  /** 집사가 직접 쓴 문장들 (챗 질문·증상 메모·꼭 기억할 것) */
  texts: string[];
}

export interface Readiness {
  ready: boolean;
  recordDays: number;
  textCount: number;
  /** 초안을 만들어볼 만큼 근거가 있는가 */
  canDraft: boolean;
  /** 아직이면 무엇이 더 필요한지 한 줄 (ready면 빈 문자열) */
  hint: string;
}

export function checkReadiness(input: ReadinessInput): Readiness {
  const textCount = input.texts.filter((t) => t.trim().length >= 4).length;
  const ready =
    input.recordDays >= MIN_RECORD_DAYS || textCount >= MIN_TEXTS_FOR_READY;
  const canDraft = textCount >= MIN_TEXTS_FOR_DRAFT;

  let hint = "";
  if (!ready) {
    const daysLeft = Math.max(0, MIN_RECORD_DAYS - input.recordDays);
    hint =
      daysLeft > 0
        ? `${daysLeft}일 더 기록하면 생활기록부 초안을 만들어볼 수 있어요.`
        : "조금만 더 기록해 주세요.";
  }

  return { ready, recordDays: input.recordDays, textCount, canDraft, hint };
}

/**
 * 초안의 근거가 될 문장만 모은다.
 *
 * **집사가 직접 쓴 말만 넣는다.** 냥박사 답변은 제외한다 — AI가 쓴 문장을 근거로
 * 삼으면 자기가 한 말을 근거라고 되짚는 꼴이 된다.
 * 건강 수치(식사량·체중)도 넣지 않는다 — 식사량으로 성격을 매기는 것은 지어내기이고,
 * 건강 데이터와 성격 데이터를 섞지 않는다는 원칙(지시서 P2-1)에도 어긋난다.
 */
export function collectEvidenceTexts(input: {
  /** 챗에서 집사가 보낸 메시지 (role === "user") */
  chatQuestions: string[];
  /** 증상 기록의 메모 */
  symptomNotes: string[];
  /** 꼭 기억할 것 (항목 + 자유 메모) */
  noteTexts: string[];
  limit?: number;
}): string[] {
  const all = [...input.noteTexts, ...input.symptomNotes, ...input.chatQuestions]
    .map((t) => t.trim())
    .filter((t) => t.length >= 4);
  // 같은 말을 여러 번 물어본 경우 중복 제거 — 근거가 부풀지 않게
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of all) {
    const k = t.replace(/\s+/g, "");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t.slice(0, 200));
    if (out.length >= (input.limit ?? 40)) break;
  }
  return out;
}
