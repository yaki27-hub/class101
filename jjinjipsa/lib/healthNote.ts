/*
 * '꼭 기억할 것' 메모 — 알레르기·복용약·주의사항 자유 입력 (건강 카드용).
 * 로컬 저장(오늘 상태와 동일 패턴). 공유용 텍스트 요약도 여기서 만든다.
 */

import { getCatAge } from "@/lib/catAge";
import { STATUS_ITEMS, type DailyRecord } from "@/lib/dailyStatus";
import { pushKv } from "@/lib/kvSync";
import { categoryMeta, type ImportantNote } from "@/lib/importantNotes";
import type { Cat, SymptomLog, WeightLog } from "@/lib/storage";

function noteKey(catId: string) {
  return `jjinjipsa:healthnote:${catId}`;
}

export function loadHealthNote(catId: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(noteKey(catId)) ?? "";
}

export function saveHealthNote(catId: string, note: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(noteKey(catId), note);
  pushKv(noteKey(catId)); // 계정 동기화 (lib/kvSync)
}

/** 공유용 텍스트 요약 */
export function buildHealthText(
  cat: Cat,
  note: string,
  record: DailyRecord,
  logs: SymptomLog[],
  /** 체중 기록 (오래된→최신) — 최신값과 직전 대비 변화를 넣는다 (P1-4) */
  weights: WeightLog[] = [],
  /** 꼭 기억할 것 카테고리 항목 (P1-5) — 자유 메모보다 먼저 */
  notes: ImportantNote[] = [],
): string {
  const age = getCatAge(cat.birthDate);
  const lines: string[] = [];
  lines.push(`🐾 ${cat.name} 진료 준비 카드`);
  lines.push("");
  lines.push(
    `· ${age.ageLabel}${cat.birthEstimated ? "(추정)" : ""} · 사람 나이 ${age.humanAge}세 (${age.stageLabel})`,
  );
  const basic = [
    cat.breedGroup,
    cat.weightKg ? `${cat.weightKg}kg` : null,
    cat.neutered ? "중성화 완료" : "중성화 안 함",
  ].filter(Boolean);
  lines.push(`· ${basic.join(" · ")}`);
  if (cat.conditions.length) lines.push(`· 기존 질환: ${cat.conditions.join(", ")}`);

  // 체중 — 수의사가 먼저 묻는 수치라 기본 정보 바로 뒤에 둔다
  const sortedW = [...weights].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
  const latestW = sortedW[sortedW.length - 1];
  const prevW = sortedW.length > 1 ? sortedW[sortedW.length - 2] : null;
  if (latestW) {
    const delta = prevW
      ? Number((latestW.weightKg - prevW.weightKg).toFixed(2))
      : null;
    const tail =
      prevW && delta !== null
        ? ` (직전 ${prevW.weightKg}kg ${prevW.measuredAt} 대비 ${delta > 0 ? "+" : ""}${delta}kg)`
        : "";
    lines.push(`· 체중: ${latestW.weightKg}kg (${latestW.measuredAt} 기준)${tail}`);
  }

  if (notes.length > 0 || note.trim()) {
    lines.push("");
    lines.push("📌 꼭 기억할 것");
    for (const n of notes) {
      lines.push(`· ${categoryMeta(n.category).label}: ${n.content.trim()}`);
    }
    if (note.trim()) lines.push(note.trim());
  }

  const today = STATUS_ITEMS.map((it) => {
    const v = record[it.key];
    return v ? `${it.label} ${v.label}` : null;
  }).filter(Boolean);
  if (today.length) {
    lines.push("");
    lines.push(`오늘 상태: ${today.join(" / ")}`);
  }

  // 최근 30일 증상 — 카드와 같은 기준으로 자른다
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceKey = since.toISOString().slice(0, 10);
  const recent = logs
    .filter((l) => l.occurredAt.slice(0, 10) >= sinceKey)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  if (recent.length) {
    lines.push("");
    lines.push(`최근 30일 증상 (${recent.length}건)`);
    for (const l of recent.slice(0, 5)) {
      lines.push(
        `· ${l.occurredAt.slice(5, 10).replace("-", "/")} ${l.tags.map((t) => `#${t}`).join(" ")} ${l.summary}`,
      );
    }
  }

  lines.push("");
  lines.push("— 찐집사에서 작성 (참고용, 진단은 수의사 상담)");
  return lines.join("\n");
}
