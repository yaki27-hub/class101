"use client";

/*
 * 공용 상단바 — 모카 리스킨 (피그마 TopBar + 뒤로가기 요청 반영).
 *
 * 피그마 시안의 상단바는 [아바타+이름 ... 기어]인데, 하위 화면에서 뒤로 갈 방법이
 * 없다는 피드백이 있었다. 그래서 두 모드를 한 컴포넌트로 합친다:
 *  - 탭 최상위(back 없음):  [아바타·이름]              [기어]
 *  - 하위 화면(back 지정):  [‹ 뒤로] [제목]            [기어]
 *
 * 동작 규칙은 BackButton과 동일 — 앱 안에서 온 경우 실제 히스토리로 돌아가고,
 * 딥링크·새로고침이면 fallback으로 보낸다 ("막다른 길 없음").
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconGear } from "@/components/icons";
import CatAvatar from "@/components/CatAvatar";
import type { Cat } from "@/lib/storage";

export default function TopBar({
  cat,
  title,
  back,
  onTitleClick,
  gear = true,
}: {
  /** 있으면 아바타+이름을 왼쪽에 (탭 최상위 모드) */
  cat?: Pick<Cat, "id" | "name" | "photo"> | null;
  /** 하위 화면 제목 — back과 함께 쓴다 */
  title?: string;
  /** 뒤로가기 fallback 경로 — 지정하면 ‹ 버튼이 생긴다 */
  back?: string;
  /** 이름/제목 탭 (아이 전환 시트 등) */
  onTitleClick?: () => void;
  gear?: boolean;
}) {
  const router = useRouter();

  function goBack() {
    const idx =
      typeof window !== "undefined"
        ? (window.history.state as { idx?: number } | null)?.idx
        : undefined;
    if (typeof idx === "number" && idx > 0) router.back();
    else if (back) router.push(back);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-rd-line-soft bg-rd-page/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      {back !== undefined && (
        <button
          type="button"
          onClick={goBack}
          aria-label="뒤로"
          className="flex size-10 flex-none items-center justify-center text-rd-ink active:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M14.7 4.3a1.2 1.2 0 0 1 0 1.7L8.4 12l6.3 6a1.2 1.2 0 1 1-1.7 1.8l-7.2-6.9a1.2 1.2 0 0 1 0-1.75L13 4.3a1.2 1.2 0 0 1 1.7 0Z" />
          </svg>
        </button>
      )}

      {cat ? (
        <button
          type="button"
          onClick={onTitleClick}
          className="flex min-w-0 items-center gap-2.5 pl-1 active:opacity-70"
        >
          <CatAvatar cat={cat} size={32} radius={999} />
          <span className="truncate text-[16px] font-bold tracking-[-0.02em] text-rd-forest">
            {cat.name}
          </span>
          {onTitleClick && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="flex-none text-rd-muted">
              <path d="M4.3 8.3a1.2 1.2 0 0 1 1.7 0l6 6.3 6-6.3a1.2 1.2 0 1 1 1.8 1.7l-6.9 7.2a1.2 1.2 0 0 1-1.75 0L4.3 10a1.2 1.2 0 0 1 0-1.7Z" />
            </svg>
          )}
        </button>
      ) : (
        title && (
          <p className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-[-0.02em] text-rd-ink">
            {title}
          </p>
        )
      )}

      <span className="min-w-0 flex-1" />

      {gear && (
        <Link
          href="/account"
          aria-label="설정"
          className="flex size-10 flex-none items-center justify-center text-rd-muted active:opacity-70"
        >
          <IconGear size={21} />
        </Link>
      )}
    </header>
  );
}
