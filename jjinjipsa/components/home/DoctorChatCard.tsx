"use client";

/*
 * 냥박사 통합 카드 (AI상담 + 사진진단 통합) — 홈 최상위 CTA (지시서 §7).
 * 입력창 → 채팅(질문 전달) / 카메라 → 채팅(사진 첨부) / 추천 칩 → 입력창에 채운 채 이동.
 * 최근 증상 기록이 있으면 "지난 기록과 비교" 개인화 CTA를 우선 노출.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
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
    <section className="rounded-card border border-soft-pink bg-primary/5 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary/20 text-2xl">
          🐱
        </span>
        <div>
          <p className="text-[17px] font-bold text-secondary">냥박사에게 물어보세요</p>
          <p className="text-[13px] text-body">
            {cat.name}의 건강·행동, 편하게 질문해 주세요.
          </p>
        </div>
      </div>

      {/* 입력창 + 카메라 */}
      <div className="mt-4 flex items-center gap-2 rounded-input border border-hairline bg-white px-3">
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
          className="flex size-9 flex-none items-center justify-center rounded-full bg-surface-soft text-lg"
        >
          📷
        </button>
      </div>

      {/* 개인화 CTA (최근 증상 기록 있을 때) 또는 기본 추천 칩 */}
      {lastTag ? (
        <button
          onClick={() =>
            toChat(`지난번 '${lastTag}' 기록이랑 오늘 상태를 비교해 줄 수 있어요?`)
          }
          className="mt-3 flex w-full items-center justify-between rounded-input border border-soft-pink bg-white px-4 py-3 text-left"
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
              className="min-h-[38px] rounded-full border border-hairline bg-white px-3.5 text-[13px] font-semibold text-secondary"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
