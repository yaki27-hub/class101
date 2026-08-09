"use client";

/*
 * 하단 내비 — 검정 알약이 콘텐츠 위에 떠 있다 (찐집사 홈 리디자인 시안).
 *
 * 활성 탭만 흰 알약 + 라벨을 갖고, 나머지는 아이콘만 남는다. 라벨 4개를 다 두면
 * 히어로 위에서 검정 덩어리가 너무 커진다.
 *
 * "우리 아이(/cats)"는 시안 내비에 자리가 없어서 홈 헤더 왼쪽 버튼이 가져갔다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconChat, IconRecord, IconGear } from "@/components/icons";

const NAV_BG = "#1A1A1A";

const TABS = [
  { href: "/", Icon: IconHome, label: "오늘냥" },
  { href: "/records", Icon: IconRecord, label: "기록" },
  { href: "/chat", Icon: IconChat, label: "냥박사" },
  { href: "/account", Icon: IconGear, label: "설정" },
];

export default function BottomNav() {
  const pathname = usePathname();
  /*
   * 숨김 — 로그인·온보딩·대화(전체몰입)에 더해 고양이 상세를 추가한다.
   * 상세는 하단에 고정 CTA("냥박사에게 물어보기")가 있어서 알약과 겹친다.
   */
  if (
    pathname === "/login" ||
    pathname === "/onboard" ||
    /^\/cats\/[^/]+$/.test(pathname) ||
    /\/cats\/[^/]+\/chat$/.test(pathname) ||
    // 생활기록부는 자체 스티키 CTA가 있다 — 알약과 겹치면 CTA를 가린다
    /\/cats\/[^/]+\/report$/.test(pathname)
  )
    return null;

  return (
    <nav className="pointer-events-none sticky bottom-0 z-40 nav-overlay px-5">
      <div
        className="pointer-events-auto flex h-16 items-center justify-around rounded-full px-2.5 shadow-[0_10px_26px_-8px_rgba(0,0,0,.5)]"
        style={{ background: NAV_BG }}
      >
        {TABS.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const { Icon } = t;
          return active ? (
            <Link
              key={t.href}
              href={t.href}
              aria-current="page"
              className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[13.5px] font-bold tracking-[-0.02em] whitespace-nowrap text-rd-ink"
            >
              <Icon size={19} dotFill={NAV_BG} />
              {t.label}
            </Link>
          ) : (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.label}
              className="flex size-11 items-center justify-center text-white/60"
            >
              <Icon size={22} dotFill={NAV_BG} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
