/*
 * KB 검색 — 질문에서 KB 문서를 골라 프롬프트에 넣을 근거로 쓴다.
 *
 * 임베딩 없이 어휘 매칭으로 시작한다. KB가 50건이라 전수 스캔이 충분히 빠르고,
 * aliases가 집사 표현("감자를 못 눠요")으로 채워져 있어 매칭률이 낮지 않다.
 * 정확도가 부족해지면 이 파일만 임베딩 검색으로 교체하면 된다.
 */

import index from "./index.generated.json";

export interface KbDoc {
  id: string;
  ko: string;
  en: string;
  aliases: string[];
  category: string;
  urgency: string;
  triggers: string[];
  sources: string[];
  /** 수의사 감수 전이면 true */
  draft: boolean;
  reviewedBy: string;
  brief: string;
  signs: string;
  observe: string;
  path: string;
}

export const KB_DOC_COUNT: number = index.docCount;
export const KB_INSTITUTIONS: string[] = index.institutions;
const ALL_DOCS = index.docs as KbDoc[];

/**
 * 감수 완료 문서만 챗봇이 참조하도록 강제하는 스위치.
 *
 * 기본은 꺼짐 — 현재 감수 완료가 0건이라 켜면 KB 참조가 통째로 사라진다.
 * **수의사 감수가 끝나는 대로 `KB_REQUIRE_REVIEWED=1`로 켤 것.**
 * (Vercel 환경변수로 재배포 없이 전환 가능)
 */
const REQUIRE_REVIEWED = process.env.KB_REQUIRE_REVIEWED === "1";
const DOCS = REQUIRE_REVIEWED ? ALL_DOCS.filter((d) => !d.draft) : ALL_DOCS;

/** 감수 현황 — 운영 점검용 */
export const KB_REVIEWED_COUNT = ALL_DOCS.filter((d) => !d.draft).length;

/** 조사·공백을 걷어내고 비교용으로 정규화 */
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

/** 매칭에 쓰기엔 너무 흔한 낱말 — 이것만으로는 점수를 주지 않는다 */
const STOP = new Set([
  "고양이", "우리", "아이", "요즘", "계속", "자꾸", "많이", "조금", "너무",
  "먹어요", "먹었어요", "나와요", "있어요", "해요", "같아요", "이에요", "예요",
]);

/**
 * 집사 은어 → KB가 쓰는 표현. 이것 없이는 "감자를 못 눠요"가 요도폐색에 닿지 않는다.
 * (시스템 프롬프트도 같은 어휘를 쓰도록 안내하고 있다)
 */
const SYNONYMS: Record<string, string[]> = {
  감자: ["소변", "오줌"],
  맛동산: ["대변", "변", "응가"],
  쉬야: ["소변", "오줌"],
  똥: ["대변", "변"],
  우다다: ["활동", "과활동"],
  개구호흡: ["입을 벌리고 숨", "호흡곤란"],
  헥헥: ["호흡", "숨"],
  캑캑: ["기침"],
  꾹꾹이: ["그루밍", "행동"],
};

/** 한글·영숫자 덩어리로 자르고, 짧거나 흔한 것은 버린다 */
function tokenize(text: string): string[] {
  return (text.match(/[가-힣]+|[a-zA-Z0-9]+/g) ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

/** 문서별 키워드 집합 (질환명 + aliases에서 뽑은 토큰) */
const DOC_TOKENS: Map<string, string[]> = new Map();
/** 토큰이 몇 개 문서에 나타나는지 — 흔한 토큰의 가중치를 낮추기 위해 */
const DOC_FREQ: Map<string, number> = new Map();

for (const doc of DOCS) {
  const toks = new Set<string>();
  for (const t of tokenize(doc.ko)) toks.add(t);
  for (const a of doc.aliases) for (const t of tokenize(a)) toks.add(t);
  DOC_TOKENS.set(doc.id, [...toks]);
  for (const t of toks) DOC_FREQ.set(t, (DOC_FREQ.get(t) ?? 0) + 1);
}

/**
 * 흔한 토큰일수록 낮은 가중치 (mini IDF). 10개 문서 이상에 나오면 0점.
 * 하한(3점) 위로 올라가야 결과에 남으므로, 드문 토큰 하나만 맞아도
 * 통과하도록 잡았다 — "백합"(df 2) 한 단어로 중독 문서가 걸리는 것이 중요하다.
 */
function weight(token: string): number {
  const df = DOC_FREQ.get(token) ?? 1;
  if (df >= 10) return 0;
  if (df >= 5) return 1;
  if (df >= 2) return 3;
  return 5; // 이 문서에만 나오는 고유 토큰 (타이레놀, 자일리톨 …)
}

export interface KbHit {
  doc: KbDoc;
  score: number;
}

/**
 * 질문(+증상 태그)에 관련된 KB 문서를 점수순으로 고른다.
 * @param query 집사의 질문 원문
 * @param extra 증상 태그 등 추가 힌트
 * @param limit 최대 개수
 */
export function retrieveKb(query: string, extra: string[] = [], limit = 3): KbHit[] {
  const source = [query, ...extra].join(" ");
  // 집사 은어를 KB 표현으로 확장해 함께 검색한다
  let expanded = source;
  for (const [slang, words] of Object.entries(SYNONYMS)) {
    if (source.includes(slang)) expanded += ` ${words.join(" ")}`;
  }
  const haystack = norm(expanded);
  if (haystack.length < 2) return [];

  const hits: KbHit[] = [];
  for (const doc of DOCS) {
    let score = 0;

    // 질환명 직접 언급 — 가장 강한 신호
    if (doc.ko && haystack.includes(norm(doc.ko))) score += 10;
    // 질환명이 "귀진드기 · 외이염"처럼 복합이면 조각으로도 확인
    for (const part of doc.ko.split(/[·,()]/)) {
      const p = norm(part);
      if (p.length >= 2 && !STOP.has(p) && haystack.includes(p)) score += 6;
    }

    // aliases 문장 통째 일치 — 표현이 그대로 겹치면 확실한 신호
    for (const a of doc.aliases) {
      const n = norm(a);
      if (n.length >= 4 && haystack.includes(n)) score += 5;
    }

    // 토큰 단위 매칭 — 어미가 달라도("먹었어요" vs "핥았어요") 명사가 겹치면 잡힌다.
    // 흔한 토큰은 weight()가 걸러서 아무 문서나 딸려오지 않게 한다.
    for (const t of DOC_TOKENS.get(doc.id) ?? []) {
      if (haystack.includes(t)) score += weight(t);
    }

    // urgency_triggers — 위험 신호 문장의 핵심 어절이 겹치면 가점
    for (const t of doc.triggers) {
      const words = t.split(/\s+/).filter((w) => w.length >= 3);
      const matched = words.filter((w) => haystack.includes(norm(w))).length;
      if (matched >= 2) score += 4;
    }

    if (score > 0) hits.push({ doc, score });
  }

  hits.sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id));
  // 노이즈 컷: 최고점의 1/3 미만은 버린다 (한 단어만 스친 문서 제외)
  const top = hits[0]?.score ?? 0;
  return hits.filter((h) => h.score >= Math.max(3, top / 3)).slice(0, limit);
}

/** 프롬프트에 넣을 근거 블록 */
export function formatKbForPrompt(hits: KbHit[]): string {
  if (hits.length === 0) return "none";
  return hits
    .map(({ doc }) =>
      [
        `<doc id="${doc.id}" name="${doc.ko}" urgency="${doc.urgency}">`,
        `요약: ${doc.brief}`,
        doc.signs ? `병원에 가야 하는 신호: ${doc.signs}` : "",
        doc.observe ? `경과 관찰 기준: ${doc.observe}` : "",
        `출처: ${doc.sources.join(", ")}`,
        `</doc>`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

/** 화면에 보여줄 최소 정보 (문서 본문은 클라이언트로 보내지 않는다) */
export interface KbRefBrief {
  id: string;
  ko: string;
  sources: string[];
  /** 수의사 감수 전이면 true — 화면에 그대로 밝힌다 */
  draft: boolean;
}

export function toRefBriefs(hits: KbHit[]): KbRefBrief[] {
  return hits.map(({ doc }) => ({
    id: doc.id,
    ko: doc.ko,
    sources: doc.sources,
    draft: doc.draft,
  }));
}
