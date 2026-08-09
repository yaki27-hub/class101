"use client";

/* 두근두근 냥 D-day — 다가오는 접종·검진 하나 (현재 더미) */

import { DDAY } from "@/lib/homeMood";

export default function DdayCard() {
  return (
    <section className="flex items-center gap-3.5 rounded-3xl bg-rd-card p-5">
      <span
        className="flex size-13 flex-none items-center justify-center rounded-2xl bg-[#FFF1EE] text-[24px]"
        aria-hidden
      >
        {DDAY.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[12px] font-semibold text-rd-muted">{DDAY.label}</p>
        <p className="truncate text-[15.5px] font-bold tracking-[-0.02em] text-rd-ink">
          {DDAY.title}
        </p>
      </div>
      <span className="flex-none rounded-full bg-rd-coral px-2.5 py-1.5 text-[12px] font-extrabold tracking-[-0.02em] text-white">
        {DDAY.badge}
      </span>
    </section>
  );
}
