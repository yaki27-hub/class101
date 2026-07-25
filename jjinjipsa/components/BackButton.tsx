"use client";

/*
 * 공용 뒤로가기 — 모든 하위 화면에서 형태·크기·동작을 통일한다.
 *
 * 동작 규칙: 앱 안에서 이동해 온 경우 실제로 왔던 화면으로 돌아가고(스크롤·상태 유지),
 * 딥링크·새로고침처럼 히스토리가 없으면 fallback(논리적 상위 화면)으로 보낸다.
 * → "예상 가능한 뒤로가기"와 "막다른 길 없음"을 동시에 만족 (§9 back-behavior).
 */

import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";

export default function BackButton({
  fallback,
  label,
  className = "",
}: {
  /** 히스토리가 없을 때 갈 상위 화면 */
  fallback: string;
  /** 화살표 옆 텍스트 (없으면 아이콘만) */
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function goBack() {
    // Next.js App Router는 history.state.idx로 앱 내 이동 깊이를 관리한다
    const idx =
      typeof window !== "undefined"
        ? (window.history.state as { idx?: number } | null)?.idx
        : undefined;
    if (typeof idx === "number" && idx > 0) router.back();
    else router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="뒤로 가기"
      className={`-ml-3 flex min-h-11 min-w-11 items-center justify-center gap-1 px-3 text-muted active:opacity-60 ${className}`}
    >
      <IconArrowLeft size={20} />
      {label && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
