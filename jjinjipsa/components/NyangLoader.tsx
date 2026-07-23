"use client";

/* 냥박사 로딩 — 3D 마스코트(생각) 살짝 흔들림 + 꾹꾹이 도트 */

import Mascot from "@/components/Mascot";

export default function NyangLoader() {
  return (
    <div className="flex items-center gap-2.5 rounded-card border border-hairline bg-white px-4 py-3">
      <span
        className="inline-block"
        style={{ animation: "knead 1.2s ease-in-out infinite" }}
        aria-hidden
      >
        <Mascot mood="thinking" size={34} />
      </span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-primary"
            style={{ animation: "knead 1s ease-in-out infinite", animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      <span className="text-[13px] text-muted">냥박사가 살펴보는 중…</span>
    </div>
  );
}
