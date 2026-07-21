"use client";

/* 냥박사 로딩 — 눈 깜빡 + 꼬리 살랑 (prefers-reduced-motion 존중은 globals.css) */

export default function NyangLoader() {
  return (
    <div className="flex items-center gap-2.5 rounded-card border border-hairline bg-white px-4 py-3 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
      <span className="relative inline-block text-2xl" aria-hidden>
        <span className="inline-block" style={{ animation: "blink 2.4s infinite" }}>
          🐱
        </span>
        <span
          className="absolute -right-1 bottom-0 text-sm"
          style={{ animation: "tail-wag 0.9s ease-in-out infinite", transformOrigin: "left bottom" }}
        >
          〰️
        </span>
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
