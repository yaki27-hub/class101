"use client";

/* 오늘의 케어 루틴 — 양치·빗질·사냥놀이 토글. 현재는 화면 안에서만 사는 더미 상태다. */

import { ROUTINES } from "@/lib/homeMood";

export default function CareRoutineCard({
  done,
  onToggle,
}: {
  done: boolean[];
  onToggle: (index: number) => void;
}) {
  const count = done.filter(Boolean).length;

  return (
    <section className="rounded-3xl bg-rd-card p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
          오늘의 케어 루틴
        </h2>
        <span className="text-[12px] font-semibold text-rd-muted">
          {count}/{ROUTINES.length}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {ROUTINES.map((r, i) => {
          const on = done[i];
          return (
            <button
              key={r.label}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => onToggle(i)}
              className="flex items-center gap-3 py-2.5 text-left"
            >
              <span className="w-6 text-center text-[20px]" aria-hidden>
                {r.glyph}
              </span>
              <span className="flex-1 text-[14px] font-medium tracking-[-0.01em] text-rd-ink">
                {r.label}
              </span>
              <span
                className={`flex h-6.5 w-11 items-center rounded-full p-[3px] transition-[background-color,justify-content] duration-200 ease-[cubic-bezier(.32,.72,0,1)] ${
                  on ? "justify-end bg-rd-mint" : "justify-start bg-rd-track"
                }`}
              >
                <span
                  className={`size-5 rounded-full bg-white ${
                    on ? "shadow-[0_1px_3px_rgba(0,0,0,.18)]" : "shadow-[0_1px_3px_rgba(0,0,0,.12)]"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
