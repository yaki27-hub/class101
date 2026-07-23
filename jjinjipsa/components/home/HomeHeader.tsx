"use client";

/* 홈 헤더 — 로고(Jua) + 알림 벨(unread 도트). 로그인·설정은 우리 아이/계정으로 (지시서 §4) */

import { IconBell } from "@/components/icons";

export default function HomeHeader({ unread = false }: { unread?: boolean }) {
  return (
    <header className="flex h-16 items-center justify-between">
      <p className="display text-[26px] text-ink">찐집사</p>
      <button
        type="button"
        aria-label="알림 (준비 중)"
        title="알림은 준비 중이에요"
        className="relative flex size-10 items-center justify-center text-muted"
      >
        <IconBell size={23} />
        {unread && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
        )}
      </button>
    </header>
  );
}
