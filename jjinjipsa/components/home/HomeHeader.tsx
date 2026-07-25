"use client";

/*
 * 홈 헤더 — 로고만. 알림 벨은 실제 알림 기능이 없어 제거(빈 껍데기 UI 금지).
 * 추후 리마인더/이상 신호 알림이 생기면 그때 다시 추가한다.
 */

export default function HomeHeader() {
  return (
    <header className="flex h-16 items-center">
      <p className="display text-[26px] text-ink">찐집사</p>
    </header>
  );
}
