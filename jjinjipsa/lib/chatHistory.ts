/*
 * 지난 상담 이력 — 냥박사 탭이 소유하는 정보 (docs/정보구조.md).
 *
 * 세션은 고양이당 하나씩 이어지는 구조라, 세션 목록을 보여주면 사실상 고양이
 * 목록과 같아진다. 집사가 다시 보고 싶은 건 **그때 뭐라고 판정했는지**이므로,
 * 답변에서 🚦 판정을 뽑아 시간순으로 늘어놓는다.
 */

import { storage, type ChatMessage } from "@/lib/storage";

export type VerdictLevel = "red" | "yellow" | "green";

export interface ConsultEntry {
  id: string;
  catId: string;
  catName: string;
  /** 집사가 물어본 것 (답변 바로 앞의 질문) */
  question: string;
  /** 판정 등급 — 판정 블록이 없으면 null (되묻기·일반 답변) */
  verdict: VerdictLevel | null;
  /** 판정 첫 줄 (예: "🟡 24-48시간 관찰") */
  verdictLabel: string;
  createdAt: string;
}

/** 답변 본문에서 🚦 판정 블록을 찾아 등급과 첫 줄을 뽑는다 */
export function extractVerdict(content: string): {
  level: VerdictLevel | null;
  label: string;
} {
  const text = content.replace(/\*\*/g, "");
  const m = /^[ \t]*🚦\s*판정[ \t]*[—\-:]?\s*(.*)$/m.exec(text);
  if (!m) return { level: null, label: "" };

  // 판정 헤더 줄이 비어 있으면 다음 줄이 등급인 경우가 있다
  const after = text.slice(m.index + m[0].length);
  const label = (m[1].trim() || after.split("\n").find((l) => l.trim())?.trim() || "")
    .trim()
    .slice(0, 40);

  const scope = `${m[1]}\n${after.slice(0, 120)}`;
  const level: VerdictLevel | null = scope.includes("🔴")
    ? "red"
    : scope.includes("🟢")
      ? "green"
      : scope.includes("🟡")
        ? "yellow"
        : null;
  return { level, label };
}

/** 답변 바로 앞의 집사 질문을 찾는다 */
function questionBefore(messages: ChatMessage[], index: number): string {
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

/**
 * 모든 고양이의 지난 상담을 최신순으로 모은다.
 * @param limit 최대 개수 — 화면이 길어지지 않게 제한
 */
export async function listRecentConsults(limit = 30): Promise<ConsultEntry[]> {
  const cats = await storage.listCats();
  const out: ConsultEntry[] = [];

  for (const cat of cats) {
    const sessions = await storage.listSessions(cat.id);
    for (const s of sessions) {
      const messages = await storage.listMessages(s.id);
      messages.forEach((m, i) => {
        if (m.role !== "assistant") return;
        const { level, label } = extractVerdict(m.content);
        // 판정이 없는 답변(되묻기·일반 대화)은 이력으로 남기지 않는다
        if (!level) return;
        out.push({
          id: m.id,
          catId: cat.id,
          catName: cat.name,
          question: questionBefore(messages, i).slice(0, 60),
          verdict: level,
          verdictLabel: label,
          createdAt: m.createdAt,
        });
      });
    }
  }

  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out.slice(0, limit);
}

/** 목록에 보여줄 날짜 (올해면 월·일, 아니면 연도까지) */
export function formatConsultDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return sameYear ? md : `${d.getFullYear()}년 ${md}`;
}

export const VERDICT_STYLE: Record<
  VerdictLevel,
  { dot: string; text: string; short: string }
> = {
  red: { dot: "bg-error", text: "text-error", short: "지금 병원" },
  yellow: { dot: "bg-warning", text: "text-secondary", short: "관찰" },
  green: { dot: "bg-success", text: "text-success", short: "홈케어" },
};
