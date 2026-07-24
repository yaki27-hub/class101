/*
 * '꼭 기억할 것' 메모 — 알레르기·복용약·주의사항 자유 입력 (건강 카드용).
 * 로컬 저장(오늘 상태와 동일 패턴). 공유용 텍스트 요약도 여기서 만든다.
 */

import { getCatAge } from "@/lib/catAge";
import { STATUS_ITEMS, type DailyRecord } from "@/lib/dailyStatus";
import type { Cat, SymptomLog } from "@/lib/storage";

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
}

/** 공유용 텍스트 요약 */
export function buildHealthText(
  cat: Cat,
  note: string,
  record: DailyRecord,
  logs: SymptomLog[],
): string {
  const age = getCatAge(cat.birthDate);
  const lines: string[] = [];
  lines.push(`🐾 ${cat.name} 건강 카드`);
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
  if (cat.conditions.length) lines.push(`· 기저조건: ${cat.conditions.join(", ")}`);

  if (note.trim()) {
    lines.push("");
    lines.push("📌 꼭 기억할 것");
    lines.push(note.trim());
  }

  const today = STATUS_ITEMS.map((it) => {
    const v = record[it.key];
    return v ? `${it.label} ${v.label}` : null;
  }).filter(Boolean);
  if (today.length) {
    lines.push("");
    lines.push(`오늘 상태: ${today.join(" / ")}`);
  }

  if (logs.length) {
    lines.push("");
    lines.push("최근 증상");
    for (const l of logs.slice(0, 3)) {
      lines.push(
        `· ${l.occurredAt.slice(5, 10).replace("-", "/")} ${l.tags.map((t) => `#${t}`).join(" ")} ${l.summary}`,
      );
    }
  }

  lines.push("");
  lines.push("— 찐집사에서 작성 (참고용, 진단은 수의사 상담)");
  return lines.join("\n");
}
