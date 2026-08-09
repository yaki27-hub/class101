"use client";

/*
 * 두근두근 냥 D-day — 다가오는 접종·검진 하나.
 *
 * ⚠️ 지금은 접종·재진 데이터 소스가 없어 **홈에서 렌더하지 않는다** (T-53에서 제외).
 * 영수증 OCR(T-47)로 vet_visits가 생기면 그 데이터를 받아 다시 붙인다.
 * 더미 날짜를 계속 보여주면 "우리 애 접종이 D-7?"이라는 가짜 알림이 된다.
 */

const DDAY = {
  glyph: "💉",
  label: "두근두근 냥 D-day",
  title: "종합백신 3차 접종",
  badge: "D-7",
};

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
