"use client";

/* 홈 헤더 — 로고 + 알림(자리표시). 로그인·설정은 우리 아이/계정으로 이동 (지시서 §4) */

export default function HomeHeader() {
  return (
    <header className="flex h-16 items-center justify-between">
      <p className="text-[24px] font-extrabold tracking-tight text-ink">찐집사</p>
      <button
        type="button"
        aria-label="알림 (준비 중)"
        title="알림은 준비 중이에요"
        className="flex size-10 items-center justify-center rounded-full text-[20px] text-muted"
      >
        🔔
      </button>
    </header>
  );
}
