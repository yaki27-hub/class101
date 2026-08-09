"use client";

/*
 * 라우트 에러 화면 — Next 기본 영어 화면("This page couldn't load") 대체.
 *
 * 가장 흔한 원인은 배포 교체 직후 옛 청크를 든 채 재진입하는 ChunkLoadError다.
 * 이 경우 새로고침이 곧 해결이므로 사용자에게 묻지 않고 한 번 자동으로 리로드한다.
 * 무한 리로드 루프를 막기 위해 세션당 1회만 — 그래도 실패하면 화면을 보여준다.
 */

import { useEffect, useState } from "react";
import Mascot from "@/components/Mascot";

const RELOAD_KEY = "jjinjipsa:chunkReloaded";

function isChunkError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      error.message,
    )
  );
}

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 자동 리로드 중에는 에러 화면을 깜빡이지 않는다
  const [autoReloading, setAutoReloading] = useState(false);

  useEffect(() => {
    if (!isChunkError(error)) return;
    if (sessionStorage.getItem(RELOAD_KEY) === "1") return;
    sessionStorage.setItem(RELOAD_KEY, "1");
    setAutoReloading(true);
    window.location.reload();
  }, [error]);

  if (autoReloading) return null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-rd-page px-6 text-center">
      <Mascot mood="calm" size={92} />
      <h1 className="display text-[20px] text-rd-ink">화면을 여는 데 실패했어요</h1>
      <p className="text-sm leading-relaxed text-rd-body">
        앱이 새 버전으로 바뀌는 중이었을 수 있어요.
        <br />
        새로고침하면 대부분 해결돼요.
      </p>
      <div className="mt-1 flex w-full max-w-[280px] flex-col gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-12 w-full rounded-[14px] bg-rd-ink text-sm font-bold text-white active:scale-[0.99]"
        >
          새로고침
        </button>
        <button
          type="button"
          onClick={reset}
          className="h-11 w-full rounded-[14px] border border-rd-line bg-white text-sm font-semibold text-rd-body"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
