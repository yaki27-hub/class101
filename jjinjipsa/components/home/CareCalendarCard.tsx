"use client";

/* 케어 캘린더 — 11일치 스트립. 민트 점 = 그날 기록이 있음 (오늘 상태 + 증상 기록, T-53). */

import Link from "next/link";
import type { CalendarDay } from "@/lib/homeMood";

export default function CareCalendarCard({
  days,
  range,
}: {
  days: CalendarDay[];
  range: string;
}) {
  return (
    <section className="rounded-3xl bg-rd-card px-4 py-5">
      <div className="mx-1 mb-3.5 flex items-center justify-between">
        <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
          케어 캘린더
        </h2>
        <Link href="/records" className="text-[12px] font-semibold text-rd-muted">
          {range}
        </Link>
      </div>

      <div className="flex justify-between gap-0.5">
        {days.map((d) => (
          <div key={`${d.dow}-${d.n}`} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10.5px] font-medium text-rd-faint">{d.dow}</span>
            <span
              className={`flex size-7 items-center justify-center rounded-full text-[12.5px] ${
                d.today
                  ? "bg-rd-ink font-bold text-white"
                  : "font-semibold text-rd-ink"
              }`}
            >
              {d.n}
            </span>
            {/* 점이 없는 날도 자리를 차지해야 날짜 줄이 위아래로 흔들리지 않는다 */}
            <span
              className={`size-[5px] rounded-full ${d.logged ? "bg-rd-mint" : ""}`}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </section>
  );
}
