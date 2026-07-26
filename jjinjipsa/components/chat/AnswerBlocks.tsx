"use client";

/*
 * 냥박사 답변 렌더러 — 🚦 판정을 맨 위에, 📖 히스토리·🧭 맥락은 접어서 보여준다.
 * 시스템 프롬프트가 5블록 헤더를 고정 표기로 내보내는 것을 전제로 파싱한다.
 * 헤더를 못 찾으면(포맷 이탈·스트리밍 초반) 원문을 그대로 보여줘 절대 내용이 사라지지 않게 한다.
 */

import { useState } from "react";

type Key = "verdict" | "observe" | "history" | "context" | "info";

const BLOCKS: { key: Key; emoji: string; label: string }[] = [
  { key: "verdict", emoji: "🚦", label: "판정" },
  { key: "observe", emoji: "🔍", label: "관찰" },
  { key: "history", emoji: "📖", label: "히스토리" },
  { key: "context", emoji: "🧭", label: "맥락" },
  { key: "info", emoji: "ℹ️", label: "" },
];

/** **·# 마크다운 기호 제거 (기존 chat 페이지의 clean과 동일 규칙) */
function clean(text: string) {
  return text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
}

/**
 * 본문을 블록별로 자른다. 헤더는 "🚦 판정" 형태이며 앞에 **가 붙어 있을 수 있다.
 * 반환값의 각 항목은 헤더를 뺀 본문이다. 헤더가 하나도 없으면 null.
 */
function parseBlocks(raw: string): Partial<Record<Key, string>> | null {
  const text = clean(raw);
  const found: { key: Key; start: number; bodyStart: number }[] = [];

  for (const b of BLOCKS) {
    // 줄 시작의 이모지 + (선택)라벨. ℹ️는 라벨 없이 바로 문장이 온다.
    const re = new RegExp(`^[ \\t]*${b.emoji}\\s*${b.label}[ \\t]*`, "m");
    const m = re.exec(text);
    if (m) found.push({ key: b.key, start: m.index, bodyStart: m.index + m[0].length });
  }
  if (found.length === 0) return null;

  found.sort((a, b) => a.start - b.start);
  const out: Partial<Record<Key, string>> = {};
  found.forEach((f, i) => {
    const end = i + 1 < found.length ? found[i + 1].start : text.length;
    const body = text.slice(f.bodyStart, end).replace(/^[—\-:\s]+/, "").trim();
    if (body) out[f.key] = body;
  });

  // 첫 헤더 앞에 붙은 도입 문장이 있으면 판정 위에 흘리지 않고 관찰에 붙인다
  const lead = text.slice(0, found[0].start).trim();
  if (lead) out.observe = out.observe ? `${lead}\n\n${out.observe}` : lead;

  return out;
}

/** 판정 첫 줄의 신호등으로 색을 고른다 */
function verdictTone(verdict: string) {
  if (verdict.includes("🔴")) {
    return { border: "border-error/40", bg: "bg-error/5", text: "text-error" };
  }
  if (verdict.includes("🟢")) {
    return { border: "border-success/40", bg: "bg-success/5", text: "text-success" };
  }
  // 기본은 주의(노랑) — 🟡이거나 판별 불가일 때 안전한 쪽
  return { border: "border-warning/50", bg: "bg-warning/10", text: "text-secondary" };
}

export default function AnswerBlocks({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const blocks = parseBlocks(content);

  // 포맷을 못 읽으면 원문 그대로 (내용 유실 방지)
  if (!blocks || (!blocks.verdict && !blocks.observe)) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">
        {clean(content)}
      </p>
    );
  }

  const tone = blocks.verdict ? verdictTone(blocks.verdict) : null;
  const hasDetails = !!(blocks.history || blocks.context);

  return (
    <div className="space-y-3">
      {/* 🚦 판정 — 가장 먼저, 가장 눈에 띄게 */}
      {blocks.verdict && tone && (
        <div className={`rounded-card border ${tone.border} ${tone.bg} px-3.5 py-3`}>
          <p className={`text-[11px] font-bold tracking-wide ${tone.text}`}>🚦 판정</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-body">
            {blocks.verdict}
          </p>
        </div>
      )}

      {/* 🔍 관찰 — 판정 바로 아래, 펼치지 않아도 보인다 */}
      {blocks.observe && (
        <div>
          <p className="text-[11px] font-bold tracking-wide text-muted">🔍 관찰</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-body">
            {blocks.observe}
          </p>
        </div>
      )}

      {/* 📖 히스토리 · 🧭 맥락 — 접어두고 필요할 때만 */}
      {hasDetails && (
        <div className="rounded-card border border-hairline bg-surface-soft/60">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
          >
            <span className="text-[13px] font-semibold text-secondary">
              {blocks.history && blocks.context
                ? "📖 히스토리 · 🧭 맥락"
                : blocks.history
                  ? "📖 히스토리"
                  : "🧭 맥락"}
            </span>
            <span className="flex items-center gap-1 text-[12px] font-medium text-muted">
              {open ? "접기" : "자세히"}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>

          {open && (
            <div className="space-y-3 border-t border-hairline px-3.5 py-3">
              {blocks.history && (
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-muted">📖 히스토리</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-body">
                    {blocks.history}
                  </p>
                </div>
              )}
              {blocks.context && (
                <div>
                  <p className="text-[11px] font-bold tracking-wide text-muted">🧭 맥락</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-body">
                    {blocks.context}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ℹ️ 면책 */}
      {blocks.info && (
        <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-muted-soft">
          ℹ️ {blocks.info}
        </p>
      )}
    </div>
  );
}
