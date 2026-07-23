"use client";

/*
 * 오늘 상태 기록 카드 (건강 점수 대체) — 상태 문구 + 식사·물·배변·활동 4버튼 + 빠른 기록 시트.
 * 이상 상태면 냥박사 상담 CTA로 오늘 문맥을 전달 (지시서 §6·§15).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import DailyStatusSheet from "./DailyStatusSheet";
import {
  STATUS_ITEMS,
  abnormalSentence,
  type DailyRecord,
  type DailyStatusLevel,
  type DailyStatusType,
  type DailySummary,
  type StatusItem,
} from "@/lib/dailyStatus";
import type { Cat } from "@/lib/storage";

function buttonStyle(level?: DailyStatusLevel): string {
  if (level === "normal") return "border-mint bg-mint/40";
  if (level === "warning" || level === "danger")
    return "border-soft-pink bg-soft-pink/50";
  return "border-hairline bg-white";
}
function mark(level?: DailyStatusLevel): string {
  if (level === "normal") return "✓";
  if (level === "warning" || level === "danger") return "!";
  return "○";
}

function stateCopy(cat: Cat, summary: DailySummary): { title: string; sub: string } {
  switch (summary.state) {
    case "empty":
      return { title: `오늘 ${cat.name}는 어때요?`, sub: "아직 오늘 기록이 없어요" };
    case "normal":
      return {
        title: "오늘도 잘 지내고 있어요",
        sub: "밥 · 물 · 배변 · 활동을 확인했어요",
      };
    case "abnormal":
      return {
        title: "오늘 평소와 다른 점이 있어요",
        sub: summary.abnormalItems.map((i) => i.label).join(" · ") + " 상태를 확인해요",
      };
    default:
      return {
        title: `오늘 기록을 ${summary.recordedCount}개 확인했어요`,
        sub: "나머지 상태도 알려주세요",
      };
  }
}

export default function DailyStatusCard({
  cat,
  record,
  summary,
  onSet,
}: {
  cat: Cat;
  record: DailyRecord;
  summary: DailySummary;
  onSet: (type: DailyStatusType, level: DailyStatusLevel, label: string) => void;
}) {
  const router = useRouter();
  const [openItem, setOpenItem] = useState<StatusItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const copy = stateCopy(cat, summary);
  const abnormal = summary.state === "abnormal";

  function handleSelect(level: DailyStatusLevel, label: string) {
    if (!openItem) return;
    const item = openItem;
    onSet(item.key, level, label);
    setOpenItem(null);
    setToast(`오늘 ${item.label} 상태를 기록했어요`);
    window.setTimeout(() => setToast(null), 1600);
  }

  function askDoctor() {
    const q = abnormalSentence(record);
    router.push(`/cats/${cat.id}/chat${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  }

  return (
    <section
      className={`rounded-card border p-5 ${abnormal ? "border-soft-pink bg-soft-pink/20" : "border-hairline bg-white"}`}
    >
      <p className="text-[17px] font-bold text-secondary">{copy.title}</p>
      <p className="mt-1 text-[13px] text-body">{copy.sub}</p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {STATUS_ITEMS.map((item) => {
          const level = record[item.key]?.level;
          return (
            <button
              key={item.key}
              onClick={() => setOpenItem(item)}
              aria-label={`${item.label} 기록하기`}
              className={`flex flex-col items-center gap-1 rounded-input border py-3 transition active:scale-95 ${buttonStyle(level)}`}
            >
              <span className="text-2xl" aria-hidden>
                {item.icon}
              </span>
              <span className="text-[13px] font-semibold text-secondary">
                {item.label}
              </span>
              <span
                className={`text-[11px] ${
                  level === "normal"
                    ? "text-success"
                    : level === "warning" || level === "danger"
                      ? "text-error"
                      : "text-muted-soft"
                }`}
                aria-hidden
              >
                {mark(level)}
              </span>
            </button>
          );
        })}
      </div>

      {abnormal && (
        <button
          onClick={askDoctor}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-button bg-primary text-sm font-bold text-white active:scale-[0.99]"
        >
          냥박사와 확인하기
        </button>
      )}

      <DailyStatusSheet
        item={openItem}
        onSelect={handleSelect}
        onClose={() => setOpenItem(null)}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-secondary px-4 py-2.5 text-[13px] font-semibold text-white [animation:toast-in_.2s_ease]"
        >
          {toast}
        </div>
      )}
    </section>
  );
}
