"use client";

/*
 * 냥박사 답변 렌더러 — 🚦 판정을 맨 위에, 📖 히스토리·🧭 맥락은 접어서 보여준다.
 * 시스템 프롬프트가 5블록 헤더를 고정 표기로 내보내는 것을 전제로 파싱한다.
 * 헤더를 못 찾으면(포맷 이탈·스트리밍 초반) 원문을 그대로 보여줘 절대 내용이 사라지지 않게 한다.
 *
 * 스타일은 리디자인 시안(2a)의 위계를 따른다: 판정은 색 카드, 관찰은 펼친 채,
 * 히스토리·맥락과 자료는 접힌 채.
 */

import { useState } from "react";
import { KB_TOTAL_DOCS } from "@/lib/kb/meta.generated";

type Key = "ask" | "verdict" | "observe" | "history" | "context" | "info";

const BLOCKS: { key: Key; emoji: string; label: string }[] = [
  // 되묻기(트리아지 §6) — 정보가 부족할 때 판정 대신 나온다
  { key: "ask", emoji: "❓", label: "조금만 더 알려주세요" },
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

/* 판정 색 — 시안 2a의 tone 3종. 색만으로 구분되지 않게 라벨(🚦 판정)은 항상 함께 둔다 */
const TONE = {
  ok: { bg: "#EDF9F4", border: "#BEE7D8", fg: "#0E5B41" },
  warn: { bg: "#FFF9E8", border: "#F5E2A8", fg: "#8A6A10" },
  danger: { bg: "#FFF5F3", border: "#FFC9BF", fg: "#D6452F" },
  ask: { bg: "#E7F7F2", border: "#B9E9DE", fg: "#0E5B41" },
} as const;

/** 판정 첫 줄의 신호등으로 색을 고른다 */
function verdictTone(verdict: string) {
  if (verdict.includes("🔴")) return TONE.danger;
  if (verdict.includes("🟢")) return TONE.ok;
  // 기본은 주의(노랑) — 🟡이거나 판별 불가일 때 안전한 쪽
  return TONE.warn;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
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
  );
}

export interface KbRef {
  id: string;
  ko: string;
  sources: string[];
  /** 수의사 감수 전 초안이면 true */
  draft?: boolean;
}

export default function AnswerBlocks({
  content,
  refs,
}: {
  content: string;
  refs?: KbRef[];
}) {
  const [open, setOpen] = useState(false);
  const [refsOpen, setRefsOpen] = useState(false);
  const blocks = parseBlocks(content);
  const institutions = [...new Set((refs ?? []).flatMap((r) => r.sources))];

  // 포맷을 못 읽으면 원문 그대로 (내용 유실 방지)
  if (!blocks || (!blocks.verdict && !blocks.observe && !blocks.ask)) {
    return (
      <p className="text-[13.5px] leading-[1.65] tracking-[-0.01em] whitespace-pre-wrap text-rd-body">
        {clean(content)}
      </p>
    );
  }

  const tone = blocks.verdict ? verdictTone(blocks.verdict) : null;
  const hasDetails = !!(blocks.history || blocks.context);
  const askOnly = !!blocks.ask && !blocks.verdict;

  return (
    <div className="flex flex-col gap-3">
      {/* ❓ 되묻기 — 판정 대신 나오는 경우. 답을 재촉하는 톤이 되지 않게 부드럽게 */}
      {blocks.ask && (
        <div
          className="rounded-[14px] border px-3.5 py-3"
          style={{ background: TONE.ask.bg, borderColor: TONE.ask.border }}
        >
          <p
            className="mb-1.5 text-[11px] font-extrabold tracking-[0.02em]"
            style={{ color: TONE.ask.fg }}
          >
            ❓ 조금만 더 알려주세요
          </p>
          <p className="text-[13.5px] leading-[1.6] tracking-[-0.01em] whitespace-pre-wrap text-rd-ink text-pretty">
            {blocks.ask}
          </p>
        </div>
      )}

      {/* 🚦 판정 — 가장 먼저, 가장 눈에 띄게 */}
      {blocks.verdict && tone && (
        <div
          className="rounded-[14px] border px-3.5 py-3"
          style={{ background: tone.bg, borderColor: tone.border }}
        >
          <p
            className="mb-1.5 text-[11px] font-extrabold tracking-[0.02em]"
            style={{ color: tone.fg }}
          >
            🚦 판정
          </p>
          <p className="text-[13.5px] leading-[1.6] tracking-[-0.01em] whitespace-pre-wrap text-rd-ink text-pretty">
            {blocks.verdict}
          </p>
        </div>
      )}

      {/* 🔍 관찰 — 판정 바로 아래, 펼치지 않아도 보인다 */}
      {blocks.observe && (
        <div>
          <p className="mb-1 text-[11px] font-extrabold tracking-[0.02em] text-rd-faint">
            🔍 관찰
          </p>
          <p className="text-[13.5px] leading-[1.65] tracking-[-0.01em] whitespace-pre-wrap text-rd-body text-pretty">
            {blocks.observe}
          </p>
        </div>
      )}

      {/* 📖 히스토리 · 🧭 맥락 — 접어두고 필요할 때만 */}
      {hasDetails && (
        <div className="overflow-hidden rounded-[14px] border border-rd-line bg-rd-well">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
          >
            <span className="min-w-0 text-[13px] font-bold tracking-[-0.01em] text-rd-ink">
              {blocks.history && blocks.context
                ? "📖 히스토리 · 🧭 맥락"
                : blocks.history
                  ? "📖 히스토리"
                  : "🧭 맥락"}
            </span>
            <span className="flex flex-none items-center gap-1 text-[12px] font-semibold whitespace-nowrap text-rd-faint">
              {open ? "접기" : "자세히"}
              <Chevron open={open} />
            </span>
          </button>

          {open && (
            <div className="flex flex-col gap-2.5 border-t border-rd-line px-3.5 py-3">
              {blocks.history && (
                <div>
                  <p className="mb-0.5 text-[11px] font-extrabold text-rd-faint">
                    📖 히스토리
                  </p>
                  <p className="text-[13px] leading-[1.65] whitespace-pre-wrap text-rd-body">
                    {blocks.history}
                  </p>
                </div>
              )}
              {blocks.context && (
                <div>
                  <p className="mb-0.5 text-[11px] font-extrabold text-rd-faint">
                    🧭 맥락
                  </p>
                  <p className="text-[13px] leading-[1.65] whitespace-pre-wrap text-rd-body">
                    {blocks.context}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 📚 이 답변이 실제로 참고한 자료 — 서버가 프롬프트에 넣은 문서만 표시한다 */}
      {refs && refs.length > 0 && !askOnly && (
        <div className="overflow-hidden rounded-[14px] border border-rd-line">
          <button
            type="button"
            onClick={() => setRefsOpen((v) => !v)}
            aria-expanded={refsOpen}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
          >
            <span className="min-w-0 text-[12px] font-bold tracking-[-0.01em] text-rd-body">
              📚 질환 자료 {KB_TOTAL_DOCS}건 중 {refs.length}건을 찾아봤어요
            </span>
            {/* 라벨이 두 줄로 접히더라도 "보기 ⌄"는 한 줄로 붙어 있어야 한다 */}
            <span className="flex flex-none items-center gap-1 text-[12px] font-semibold whitespace-nowrap text-rd-faint">
              {refsOpen ? "접기" : "보기"}
              <Chevron open={refsOpen} />
            </span>
          </button>

          {refsOpen && (
            <div className="flex flex-col gap-1.5 border-t border-rd-line px-3.5 py-3">
              {refs.map((r) => (
                <div key={r.id}>
                  <p className="text-[13px] font-semibold text-rd-ink">· {r.ko}</p>
                  {r.sources.length > 0 && (
                    <p className="pl-2.5 text-[11px] leading-relaxed text-rd-faint">
                      {r.sources.join(" · ")}
                    </p>
                  )}
                </div>
              ))}
              {institutions.length > 0 && (
                <p className="pt-1 text-[11px] leading-relaxed text-rd-faint">
                  찐집사는 {institutions.slice(0, 3).join(", ")} 등 수의학 자료를 정리해
                  두고, 질문에 맞는 문서를 찾아 답변에 참고해요.
                </p>
              )}
              {refs.some((r) => r.draft) && (
                <p className="text-[11px] leading-relaxed text-rd-faint">
                  이 자료는 아직 수의사 감수를 받기 전이에요. 참고용으로만 봐주세요.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ℹ️ 면책 */}
      {blocks.info && (
        <p className="text-[11.5px] leading-[1.6] whitespace-pre-wrap text-rd-faint">
          ℹ️ {blocks.info}
        </p>
      )}
    </div>
  );
}
