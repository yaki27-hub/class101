"use client";

/*
 * 오늘의 케어 루틴 — 양치·빗질·사냥놀이 토글.
 *
 * 양치에만 연속 일수를 붙인다 (지시서 P1-3). 셋에 다 붙이면 카드가 숫자밭이 되고,
 * 매일 하는 것이 의미 있는 항목은 사실 양치다. 빗질·사냥놀이는 며칠 걸러 해도
 * 문제가 아니라서 "끊겼다"는 신호를 주는 게 오히려 부정확하다.
 */

import { BRUSH_MILESTONES } from "@/lib/careRoutine";
import { ROUTINES } from "@/lib/homeMood";

export default function CareRoutineCard({
  done,
  onToggle,
  brushStreak = 0,
}: {
  done: boolean[];
  onToggle: (index: number) => void;
  /** 양치 연속 일수 (0이면 표시하지 않는다) */
  brushStreak?: number;
}) {
  const count = done.filter(Boolean).length;
  const milestone = BRUSH_MILESTONES.includes(brushStreak);

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
                {/* 양치만 연속 일수 — 0일이면 아무 말도 하지 않는다 */}
                {i === 0 && brushStreak > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums ${
                      milestone
                        ? "bg-rd-mint text-rd-ink"
                        : "bg-rd-mint-soft text-rd-forest"
                    }`}
                  >
                    {milestone && <span aria-hidden>🎉 </span>}
                    {brushStreak}일 연속
                  </span>
                )}
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
