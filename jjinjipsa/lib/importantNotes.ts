/*
 * 꼭 기억할 것 — 카테고리 항목 (지시서 P1-5).
 *
 * **기존 자유 메모(lib/healthNote)를 대체하지 않는다.** 자유 메모 키는 손대지 않고
 * 항목 목록을 별도 키에 나란히 둔다 — 이미 적어둔 메모를 마이그레이션하다 잃는 것이
 * 이 기능으로 얻는 것보다 훨씬 비싸다 (지시서 '절대 하지 말 것' 3항).
 * 자유 메모는 "그 밖에 적어둔 것"으로 계속 살아 있고, 항목은 그 위에 쌓인다.
 *
 * 카테고리를 나누는 이유는 분류 자체가 아니라 **꺼내 쓰는 순서** 때문이다.
 * 진료 준비 카드와 냥박사 프롬프트에서 복용약·알레르기가 사료 취향보다 먼저 나와야 한다.
 */

import { pushKv } from "@/lib/kvSync";

export type NoteCategory =
  | "medication"
  | "allergy"
  | "disease"
  | "hospital"
  | "food"
  | "other";

export interface ImportantNote {
  id: string;
  category: NoteCategory;
  content: string;
  createdAt: string;
}

/** 표시 순서 = 중요도 순서. 진료·상담에서 먼저 봐야 하는 것이 위에 온다 */
export const NOTE_CATEGORIES: Array<{
  key: NoteCategory;
  label: string;
  glyph: string;
  placeholder: string;
}> = [
  {
    key: "medication",
    label: "복용약",
    glyph: "💊",
    placeholder: "예: 아테놀올 하루 1회, 아침 사료에 섞어서",
  },
  {
    key: "allergy",
    label: "알레르기",
    glyph: "🚫",
    placeholder: "예: 닭고기 먹으면 턱 발진",
  },
  {
    key: "disease",
    label: "기존 질환",
    glyph: "🩺",
    placeholder: "예: 2024년 만성 신장질환 진단",
  },
  {
    key: "hospital",
    label: "병원",
    glyph: "🏥",
    placeholder: "예: OO동물병원 02-000-0000, 김OO 원장님",
  },
  {
    key: "food",
    label: "사료 · 급여",
    glyph: "🍚",
    placeholder: "예: 신장 처방식만, 하루 60g 2회",
  },
  { key: "other", label: "그 밖에", glyph: "📌", placeholder: "예: 이동장 무서워해요" },
];

export function categoryMeta(key: NoteCategory) {
  return NOTE_CATEGORIES.find((c) => c.key === key) ?? NOTE_CATEGORIES[5];
}

const storeKey = (catId: string) => `jjinjipsa:notes:${catId}`;

export function loadNotes(catId: string): ImportantNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(catId)) || "[]") as ImportantNote[];
    if (!Array.isArray(raw)) return [];
    // 카테고리 순서대로 정렬해 화면·프롬프트가 같은 순서를 본다
    const order = NOTE_CATEGORIES.map((c) => c.key);
    return raw
      .filter((n) => n && typeof n.content === "string" && n.content.trim())
      .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  } catch {
    return [];
  }
}

export function saveNotes(catId: string, notes: ImportantNote[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storeKey(catId), JSON.stringify(notes));
  pushKv(storeKey(catId)); // 계정 동기화 (lib/kvSync)
}

/**
 * 프롬프트·공유 카드용 한 줄 요약 목록.
 * 자유 메모는 마지막에 "그 밖에 적어둔 것"으로 붙인다 — 항목이 우선이다.
 */
export function formatNotesForPrompt(
  notes: ImportantNote[],
  freeNote: string,
): string {
  const lines = notes.map((n) => `${categoryMeta(n.category).label}: ${n.content.trim()}`);
  if (freeNote.trim()) lines.push(`그 밖에 적어둔 것: ${freeNote.trim()}`);
  return lines.join("\n");
}
