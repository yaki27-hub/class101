"use client";

/* 빠른 기록 바텀시트 — 항목별 선택지, 선택 즉시 저장 후 닫힘 (지시서 §6) */

import BottomSheet from "@/components/BottomSheet";
import type { DailyStatusLevel, StatusItem } from "@/lib/dailyStatus";

// 핸드오프 §Bottom Sheet: 정상=민트 / 주의=버터 / 이상=코랄 / 기록안함=뉴트럴
const LEVEL_STYLE: Record<DailyStatusLevel, string> = {
  normal: "bg-mint-soft text-success",
  warning: "bg-butter-soft text-[#b8862e]",
  danger: "bg-primary-soft text-[#d2685a]",
  unknown: "bg-surface-soft text-muted",
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
            className={`flex h-12 w-full items-center justify-center rounded-[13px] px-4 text-[14px] font-semibold ${LEVEL_STYLE[opt.level]}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
