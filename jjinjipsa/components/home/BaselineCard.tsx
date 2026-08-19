"use client";

/*
 * "오늘은 평소와 비교해서" 카드 (모카 프로토타입) — lib/baseline.ts의 결과를 그린다.
 *
 * **자리를 차지할 자격이 있는 건 "평소와 다른" 항목뿐이다.** 그 항목만
 * 평소/오늘/ⓘ를 다 펼치고, 비슷한 항목과 아직 알아가는 중인 항목은 각각
 * 한 줄로 접는다 — 다 정상인 날 카드가 홈 최상단을 통째로 잡아먹지 않게.
 * (오늘 기록 자체는 히어로 칩이 이미 보여주고 있어서 여기 또 나열하면 중복이다)
 *
 * 오늘 기록한 항목만 다룬다. 기록 전 항목을 "모름"으로 나열하면 카드가
 * 잔소리가 된다 — 기록 유도는 히어로 답 칩과 CTA가 이미 맡고 있다.
 *
 * 색 시맨틱 (D-42): 세이지 = 평소대로 · 탄 = 달라진 점. "달라요"는 경고가
 * 아니라 관찰이므로 붉은 계열을 쓰지 않는다.
 */

import type { BaselineCompare, BaselineItemView } from "@/lib/baseline";

/** "식사는 / 물은" — 받침 유무로 은·는 */
function withTopicJosa(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 > 0;
  return `${word}${hasBatchim ? "은" : "는"}`;
}

/** "식사·물" — 마지막 항목에만 조사 */
function joinLabels(items: BaselineItemView[]): string {
  const labels = items.map((it) => it.label);
  return withTopicJosa(labels.join("·"));
}

/** "(기록 4일)" — 항목마다 다르면 "(기록 3~5일)" */
function daysNote(items: BaselineItemView[]): string {
  const days = items.map((it) => it.sampleDays);
  const min = Math.min(...days);
  const max = Math.max(...days);
  return min === max ? `(기록 ${min}일)` : `(기록 ${min}~${max}일)`;
}

export default function BaselineCard({ compare }: { compare: BaselineCompare }) {
  if (compare.items.length === 0) return null;

  const different = compare.items.filter((it) => it.status === "different");
  const same = compare.items.filter((it) => it.status === "same");
  const learning = compare.items.filter((it) => it.status === "learning");

  return (
    <section className="rounded-3xl bg-rd-card p-5">
      <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
        오늘은 평소와 비교해서
      </h2>

      {/* 평소와 다른 항목 — 이 카드의 존재 이유. 여기만 다 펼친다 */}
      {different.length > 0 && (
        <div className="mt-3 space-y-3">
          {different.map((it) => (
            <div key={it.key} className="rounded-2xl bg-rd-well px-4 py-3.5">
              <p className="text-[12px] font-extrabold text-rd-muted">
                {it.icon} {it.label}
              </p>
              <p className="mt-1.5 text-[14px] font-medium tracking-[-0.01em] text-rd-ink tabular-nums">
                {it.baselineLine}
              </p>
              <p className="mt-0.5 text-[14px] font-bold tracking-[-0.01em] text-rd-ink">
                {it.todayLine}
              </p>
              <p className="mt-2 rounded-[10px] bg-[#EFE5D8] px-3 py-2 text-[12.5px] font-bold text-[#8B5F37]">
                ⓘ {it.note}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 비슷한 항목·알아가는 중 — 한 줄씩만 */}
      {same.length > 0 && (
        <p className="mt-3 text-[13px] font-semibold text-rd-forest">
          ✓ {joinLabels(same)} 평소와 비슷해요
        </p>
      )}
      {learning.length > 0 && (
        <p className="mt-2 text-[13px] font-medium text-rd-muted">
          🌱 {joinLabels(learning)} 아직 평소를 알아가는 중이에요 {daysNote(learning)}
        </p>
      )}
    </section>
  );
}
