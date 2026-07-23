"use client";

/*
 * 냥박사 통합 카드 (AI상담 + 사진진단) — 홈 최상위 CTA. Accent Card(코랄 그라데이션) + 3D 마스코트.
 * 입력창 → 채팅 / 카메라 → 사진 첨부 채팅 / 추천 칩 → 프리필. 최근 증상 있으면 비교 CTA 우선.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import Mascot from "@/components/Mascot";
import { IconCamera } from "@/components/icons";
import type { Cat, SymptomLog } from "@/lib/storage";

const DEFAULT_CHIPS = ["밥을 안 먹어요", "토했어요", "물을 많이 마셔요", "이거 먹어도 돼요?"];

export default function DoctorChatCard({
  cat,
  recent,
}: {
  cat: Cat;
  recent: SymptomLog[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");

  function toChat(q?: string) {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    router.push(`/cats/${cat.id}/chat${query}`);
  }

  const lastTag = recent[0]?.tags?.[0];

  return (
    <section
      className="relative overflow-hidden rounded-card border border-[#ffd7ce] p-5"
      style={{ background: "linear-gradient(135deg,#fff7f3,#fff0eb)" }}
    >
      {/* 하트 데코 */}
      <span className="pointer-events-none absolute right-4 top-3 text-[18px] text-[#ffb7a8]" aria-hidden>
        ♥
      </span>
      <span className="pointer-events-none absolute right-9 top-5 text-[12px] text-[#ffd1c6]" aria-hidden>
        ♥
      </span>

      <div className="flex items-center gap-3">
        <span className="flex size-14 flex-none items-center justify-center rounded-[16px] bg-white/70">
          <Mascot mood="thinking" size={48} />
        </span>
        <div className="min-w-0">
          <p className="display text-[19px] text-secondary">냥박사에게 물어보세요</p>
          <p className="text-[13px] text-muted">
            {cat.name}의 건강·행동, 편하게 질문해 주세요.
          </p>
        </div>
      </div>

      {/* 입력창 + 카메라 */}
      <div className="mt-4 flex items-center gap-2 rounded-[18px] border border-hairline bg-white px-3 focus-within:border-primary">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) toChat(text || undefined);
          }}
          placeholder="무엇이 궁금한가요?"
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted-soft focus:outline-none"
        />
        <button
          type="button"
          aria-label="사진으로 물어보기"
          onClick={() => router.push(`/cats/${cat.id}/chat?photo=1`)}
          className="flex size-9 flex-none items-center justify-center rounded-full bg-primary-soft text-primary-deep"
        >
          <IconCamera size={19} />
        </button>
      </div>

      {/* 최근 증상 기록 있으면 비교 CTA, 없으면 기본 추천 칩 */}
      {lastTag ? (
        <button
          onClick={() =>
            toChat(`지난번 '${lastTag}' 기록이랑 오늘 상태를 비교해 줄 수 있어요?`)
          }
          className="mt-3 flex w-full items-center justify-between rounded-[18px] border border-[#ffd7ce] bg-white px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[13px] font-bold text-secondary">
              최근 ‘{lastTag}’ 기록이 있었어요
            </span>
            <span className="block text-[12px] text-muted">
              지난 기록과 비교해 볼까요?
            </span>
          </span>
          <span className="flex-none text-primary-deep">›</span>
        </button>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {DEFAULT_CHIPS.map((q) => (
            <button
              key={q}
              onClick={() => toChat(q)}
              className="flex min-h-[38px] items-center gap-1.5 rounded-full border border-hairline bg-white px-3.5 text-[13px] font-semibold text-secondary"
            >
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              {q}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
