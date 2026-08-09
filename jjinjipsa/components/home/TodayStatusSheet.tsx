"use client";

/*
 * 오늘 상태 입력 시트 (T-51) — 리디자인으로 사라졌던 4항목(식사·물·배변·활동)
 * 입력 경로의 복원판. 히어로 3칩·점수·무드가 이 입력에서 계산된다 (T-53).
 *
 * 네 항목을 한 시트에 펼쳐 연속으로 기록한다 — 항목마다 시트를 여닫게 하면
 * 4번 여닫아야 해서 하루 기록이 일이 된다. 선택 즉시 저장되고, 뒤의 히어로가
 * 실시간으로 바뀌는 것이 기록의 보상이다.
 */

import BottomSheet from "@/components/BottomSheet";
import { STATUS_ITEMS, type DailyRecord, type DailyStatusLevel, type DailyStatusType } from "@/lib/dailyStatus";

const LEVEL_ON: Record<DailyStatusLevel, string> = {
  normal: "bg-rd-mint-soft text-rd-forest border-rd-mint-line",
  warning: "bg-[#FFF9E8] text-[#8A6A10] border-[#F5E2A8]",
  danger: "bg-[#FFF5F3] text-[#D6452F] border-[#FFC9BF]",
  unknown: "bg-rd-page text-rd-muted border-rd-line",
};

export default function TodayStatusSheet({
  open,
  record,
  onSet,
  onClose,
}: {
  open: boolean;
  record: DailyRecord;
  onSet: (type: DailyStatusType, level: DailyStatusLevel, label: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="오늘 상태 기록">
      <div className="max-h-[62vh] space-y-4 overflow-y-auto pb-1">
        {STATUS_ITEMS.map((item) => {
          const current = record[item.key];
          return (
            <div key={item.key}>
              <p className="mb-1.5 text-[13px] font-bold tracking-[-0.01em] text-rd-ink">
                {item.icon} {item.label}
                {current && current.level !== "unknown" && (
                  <span className="ml-1.5 font-semibold text-rd-forest">
                    {current.label}
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {item.options.map((opt) => {
                  const on = current?.label === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => onSet(item.key, opt.level, opt.label)}
                      className={`min-h-10 rounded-[12px] border px-2 py-2 text-[12.5px] font-semibold ${
                        on ? LEVEL_ON[opt.level] : "border-rd-line bg-white text-rd-body"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="mt-4 h-12 w-full rounded-[14px] bg-rd-ink text-sm font-extrabold text-white"
      >
        다 적었어요
      </button>
    </BottomSheet>
  );
}
