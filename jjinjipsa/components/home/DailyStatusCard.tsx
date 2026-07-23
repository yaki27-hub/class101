"use client";

/*
 * 오늘 상태 기록 카드 — 식사·물·배변·활동 상태 타일(미기록/정상/주의) + 빠른 기록 시트.
 * 이상 상태면 냥박사 상담 CTA로 오늘 문맥 전달 (핸드오프 Status Tile / 지시서 §6·§15).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import DailyStatusSheet from "./DailyStatusSheet";
import { IconBowl, IconWater, IconLitter, IconYarn } from "@/components/icons";
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

const ICON: Record<DailyStatusType, typeof IconBowl> = {
  meal: IconBowl,
  water: IconWater,
  toilet: IconLitter,
  activity: IconYarn,
};
// 카테고리 기본색 (핸드오프: 밥=green·물=sky·배변=neutral·활동=coral)
const ICON_COLOR: Record<DailyStatusType, string> = {
  meal: "text-success",
  water: "text-sky-ink",
  toilet: "text-muted",
  activity: "text-primary",
};

type TileState = "unrecorded" | "normal" | "warning";
function tileState(level?: DailyStatusLevel): TileState {
  if (level === "normal") return "normal";
  if (level === "warning" || level === "danger") return "warning";
  return "unrecorded";
}
const TILE_BG: Record<TileState, string> = {
  unrecorded: "border-hairline bg-white",
  normal: "border-mint bg-mint-soft",
  warning: "border-soft-pink bg-[#fff4ec]",
};

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
    <section className="rounded-card border border-hairline bg-white p-5">
      <p className="display text-[19px] text-secondary">{copy.title}</p>
      <p className="mt-1 text-[13px] text-body">{copy.sub}</p>

      <div className="mt-4 grid grid-cols-4 gap-2.5">
        {STATUS_ITEMS.map((item) => {
          const level = record[item.key]?.level;
          const st = tileState(level);
          const Glyph = ICON[item.key];
          return (
            <button
              key={item.key}
              onClick={() => setOpenItem(item)}
              aria-label={`${item.label} 기록하기`}
              className={`relative flex flex-col items-center gap-1.5 rounded-tile border py-4 transition active:scale-95 ${TILE_BG[st]}`}
            >
              {st === "normal" && (
                <span className="absolute right-1.5 top-1.5 flex size-[18px] items-center justify-center rounded-full bg-success text-[10px] font-bold text-white">
                  ✓
                </span>
              )}
              {st === "warning" && (
                <span className="absolute right-1.5 top-1.5 flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  !
                </span>
              )}
              <Glyph
                size={30}
                className={st === "warning" ? "text-primary" : ICON_COLOR[item.key]}
              />
              <span className="text-[13px] font-semibold text-secondary">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {abnormal && (
        <button
          onClick={askDoctor}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(255,141,123,0.35)] active:scale-[0.99]"
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
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white [animation:toast-in_.2s_ease]"
        >
          {toast}
        </div>
      )}
    </section>
  );
}
