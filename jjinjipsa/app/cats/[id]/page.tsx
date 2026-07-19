"use client";

/* F-02 첫 결과 화면 — 나이 환산 + 생애 시계 + 챗봇 진입 CTA (T-05) */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import { CLOCK_SEGMENTS, getCatAge } from "@/lib/catAge";

const SEGMENT_COLORS: Record<string, string> = {
  kitten: "bg-brand-mint",
  junior: "bg-brand-ochre",
  adult: "bg-brand-peach",
  mature: "bg-brand-lavender",
  senior: "bg-brand-teal",
};

export default function CatResultPage() {
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);

  useEffect(() => {
    void storage.getCat(id).then(setCat);
  }, [id]);

  if (cat === undefined) return null;
  if (cat === null)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-body">등록된 아이를 찾을 수 없어요.</p>
        <Link href="/" className="text-sm font-semibold text-ink underline">
          홈으로
        </Link>
      </main>
    );

  const age = getCatAge(cat.birthDate);
  const TOTAL = 20;

  return (
    <main className="flex-1 space-y-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-muted">
          ← 홈
        </Link>
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Life Clock
        </p>
      </header>

      {/* 와우 모먼트 — 나이 환산 */}
      <section className="rounded-xl bg-brand-pink p-6 text-white">
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] opacity-80">
          {cat.name} · {age.ageLabel}
          {cat.birthEstimated ? " (추정)" : ""}
        </p>
        <p className="display mt-2 text-[32px] leading-[1.15]">
          사람 나이로
          <br />
          {age.humanAge}세예요
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[13px] font-medium">
          {age.stageEmoji} {age.stageLabel} · {cat.breedGroup}
        </p>
      </section>

      {/* 생애 시계 */}
      <section className="rounded-lg border border-hairline bg-canvas p-5">
        <h2 className="text-sm font-semibold text-ink">
          {cat.name}의 생애 시계
        </h2>
        <div className="relative mt-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {CLOCK_SEGMENTS.map((s) => (
              <div
                key={s.stage}
                className={`${SEGMENT_COLORS[s.stage]} ${
                  s.stage === age.stage ? "" : "opacity-40"
                }`}
                style={{ width: `${((s.to - s.from) / TOTAL) * 100}%` }}
              />
            ))}
          </div>
          {/* 현재 위치 마커 */}
          <div
            className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-ink"
            style={{ left: `${age.clockRatio * 100}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          {CLOCK_SEGMENTS.map((s) => (
            <span
              key={s.stage}
              className={`whitespace-nowrap ${
                s.stage === age.stage
                  ? "rounded-full bg-surface-card px-2 py-0.5 font-semibold text-ink"
                  : "py-0.5"
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>
        <p className="mt-4 rounded-md bg-surface-soft p-3.5 text-sm leading-relaxed text-body">
          {age.stageMessage}
        </p>
      </section>

      {/* 챗봇 진입 CTA (F-08은 T-06~08에서 열림) */}
      <section className="rounded-xl bg-surface-card p-6">
        <p className="text-lg font-semibold text-ink">
          {cat.name}에 대해 궁금한 걸 물어보세요
        </p>
        <p className="mt-1 text-sm text-body">
          나이·품종·기록을 아는 챗봇이 {cat.name} 기준으로 답해드려요.
        </p>
        <Link
          href={`/cats/${cat.id}/chat`}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-md bg-ink text-sm font-semibold text-white active:bg-[#1f1f1f]"
        >
          궁금한 거 물어보기 💬
        </Link>
      </section>

      <p className="text-center text-xs text-muted-soft">
        나이 환산은 통용 공식 기준의 참고값이에요. 정확한 진단은 수의사 상담이
        필요합니다.
      </p>
    </main>
  );
}
