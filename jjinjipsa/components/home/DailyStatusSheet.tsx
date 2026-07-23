"use client";

/* 빠른 기록 바텀시트 — 항목별 선택지, 선택 즉시 저장 후 닫힘 (지시서 §6) */

import BottomSheet from "@/components/BottomSheet";
import type { DailyStatusLevel, StatusItem } from "@/lib/dailyStatus";

const LEVEL_STYLE: Record<DailyStatusLevel, string> = {
  normal: "border-mint bg-mint/40 text-secondary",
  warning: "border-soft-pink bg-soft-pink/40 text-secondary",
  danger: "border-error/40 bg-error/5 text-secondary",
  unknown: "border-hairline bg-white text-muted",
};

export default function DailyStatusSheet({
  item,
  onSelect,
  onClose,
}: {
  item: StatusItem | null;
  onSelect: (level: DailyStatusLevel, label: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={!!item} onClose={onClose} title={item?.sheetTitle}>
      <div className="space-y-2">
        {item?.options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onSelect(opt.level, opt.label)}
            className={`flex h-12 w-full items-center rounded-input border px-4 text-[15px] font-semibold ${LEVEL_STYLE[opt.level]}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
