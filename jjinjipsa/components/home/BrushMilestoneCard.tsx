"use client";

/*
 * 양치 챌린지 보상 (지시서 P2-4) — 7·15·30일 달성한 **그날에만** 뜬다.
 *
 * 단계별로 다른 것을 준다:
 *   7일  → 스탬프 (도장 하나 찍힌 느낌)
 *   15일 → 특별 카드 (색이 달라진다)
 *   30일 → 기념 이미지 (저장·공유 버튼이 붙는다)
 *
 * **AI 이미지는 쓰지 않는다** (지시서 P2-4). 축하 하나에 생성 비용을 붙이면
 * 사용자가 늘수록 비용이 선형으로 늘고, 정작 상담에 쓸 예산을 먹는다.
 * 도장·별·색만으로 충분히 축하할 수 있다.
 *
 * 하루만 보이는 이유: 8일째에도 계속 떠 있으면 축하가 배경이 된다. 마일스톤은
 * 정확히 그 숫자일 때만 걸린다(BRUSH_MILESTONES 포함 여부).
 */

import { forwardRef, useRef, useState } from "react";
import { shareNodeAsImage } from "@/lib/shareImage";

type Tier = "stamp" | "card" | "memorial";

function tierOf(streak: number): Tier {
  if (streak >= 30) return "memorial";
  if (streak >= 15) return "card";
  return "stamp";
}

const STYLE: Record<Tier, { bg: string; ink: string; sub: string; badge: string }> = {
  stamp: { bg: "#E7F7F2", ink: "#0E5B41", sub: "#3F4642", badge: "#B9E9DE" },
  card: { bg: "#FFF6DE", ink: "#8A6A10", sub: "#3F4642", badge: "#FFE9A8" },
  memorial: { bg: "#0E5B41", ink: "#FFFFFF", sub: "rgba(255,255,255,.78)", badge: "#0A3D2B" },
};

const COPY: Record<Tier, { title: (n: number) => string; body: string }> = {
  stamp: {
    title: (n) => `양치 ${n}일 연속`,
    body: "일주일을 채웠어요. 도장 하나 찍어드릴게요.",
  },
  card: {
    title: (n) => `양치 ${n}일 연속`,
    body: "보름을 이어갔어요. 이 정도면 습관이 된 거예요.",
  },
  memorial: {
    title: (n) => `양치 ${n}일 연속`,
    body: "한 달을 하루도 빠짐없이. 치아는 한 번 상하면 되돌리기 어려워서, 이 기록이 정말 값져요.",
  },
};

/** 캡처 대상 — 색이 자체 완결이어야 한다 (외부 배경 의존 금지) */
const MilestoneArt = forwardRef<
  HTMLDivElement,
  { streak: number; catName: string }
>(function MilestoneArt({ streak, catName }, ref) {
  const tier = tierOf(streak);
  const s = STYLE[tier];
  const c = COPY[tier];
  return (
    <div
      ref={ref}
      className="flex flex-col items-center gap-2 rounded-3xl px-6 py-7 text-center"
      style={{ background: s.bg }}
    >
      {/* 도장 — 이미지 생성 없이 원 + 숫자로 만든다 */}
      <span
        className="flex size-[76px] items-center justify-center rounded-full text-[26px] font-extrabold tabular-nums"
        style={{
          background: s.badge,
          color: tier === "memorial" ? "#FFFFFF" : "#1A1A1A",
          boxShadow: tier === "memorial" ? "0 0 0 3px rgba(255,255,255,.25)" : "none",
        }}
      >
        {streak}
      </span>
      <p className="text-[17px] font-extrabold tracking-[-0.02em]" style={{ color: s.ink }}>
        🪥 {c.title(streak)}
      </p>
      <p className="text-[13px] leading-relaxed text-pretty" style={{ color: s.sub }}>
        {catName}와 함께 {c.body}
      </p>
      <p className="mt-1 text-[10.5px]" style={{ color: s.sub, opacity: 0.8 }}>
        찐집사 · 양치 챌린지
      </p>
    </div>
  );
});

export default function BrushMilestoneCard({
  streak,
  catName,
}: {
  streak: number;
  catName: string;
}) {
  const artRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const tier = tierOf(streak);

  async function save() {
    const node = artRef.current;
    if (!node) return;
    setBusy(true);
    const r = await shareNodeAsImage(
      node,
      `${catName}_양치${streak}일.png`,
      `${catName} 양치 ${streak}일 연속`,
    );
    if (r === "downloaded") setSaved("이미지를 저장했어요");
    if (r === "failed") setSaved("이미지 생성에 실패했어요");
    setBusy(false);
    if (r !== "failed") window.setTimeout(() => setSaved(null), 1800);
  }

  return (
    <section>
      <MilestoneArt ref={artRef} streak={streak} catName={catName} />
      {/* 기념 이미지는 30일부터 — 7·15일은 화면에서 축하하고 끝낸다 */}
      {tier === "memorial" && (
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="mt-2 h-11 w-full rounded-[14px] border border-rd-line bg-white text-sm font-bold text-rd-ink disabled:opacity-60"
        >
          {busy ? "만드는 중…" : saved ?? "기념 이미지 저장하기"}
        </button>
      )}
    </section>
  );
}
