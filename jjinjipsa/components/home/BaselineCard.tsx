"use client";

/*
 * "오늘은 평소와 비교해서" 카드 (모카 프로토타입) — lib/baseline.ts의 결과를 그린다.
 *
 * 오늘 기록한 항목만 보여준다. 기록 전 항목을 "모름"으로 나열하면 카드가
 * 잔소리가 된다 — 기록 유도는 히어로 칩과 CTA가 이미 맡고 있다.
 *
 * 색 시맨틱 (D-42): 세이지 = 평소대로 · 탄 = 달라진 점. 여기서도 그대로 쓰되,
 * "달라요"는 경고가 아니라 관찰이므로 붉은 계열을 쓰지 않는다.
 */

import type { BaselineCompare } from "@/lib/baseline";

export default function BaselineCard({ compare }: { compare: BaselineCompare }) {
  if (compare.items.length === 0) return null;

  return (
    <section className="rounded-3xl bg-rd-card p-5">
      <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
        오늘은 평소와 비교해서
      </h2>
      <div className="mt-3 space-y-3">
        {compare.items.map((it) => (
          <div key={it.key} className="rounded-2xl bg-rd-well px-4 py-3.5">
            <p className="text-[12px] font-extrabold text-rd-muted">
              {it.icon} {it.label}
            </p>
            {it.baselineLine && (
              <p className="mt-1.5 text-[14px] font-medium tracking-[-0.01em] text-rd-ink tabular-nums">
                {it.baselineLine}
              </p>
            )}
            <p className="mt-0.5 text-[14px] font-bold tracking-[-0.01em] text-rd-ink">
              {it.todayLine}
            </p>
            {it.status === "different" ? (
              <p className="mt-2 rounded-[10px] bg-[#EFE5D8] px-3 py-2 text-[12.5px] font-bold text-[#8B5F37]">
                ⓘ {it.note}
              </p>
            ) : (
              <p
                className={`mt-1.5 text-[12.5px] font-semibold ${
                  it.status === "same" ? "text-rd-forest" : "text-rd-muted"
                }`}
              >
                {it.status === "same" ? "✓ " : ""}
                {it.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
