"use client";

/* 공용 바텀시트 — ESC/배경 클릭으로 닫힘, 열리면 내부 포커스 (접근성 §18) */

import { useEffect, useRef } from "react";

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  tone = "paper",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * board = 칠판 화면(생활기록부)용 어두운 초록 시트.
   * "쓰는 곳"만 갑자기 밝아지면 판에서 튕겨나가는 느낌이라 판 톤을 유지한다
   * (핸드오프 결정). 판보다 살짝 밝은 초록이라 위로 떠 보인다.
   */
  tone?: "paper" | "board";
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /*
   * onClose를 ref에 담아두는 이유:
   * 호출부는 보통 `onClose={() => setOpen(false)}`처럼 인라인 함수를 넘긴다.
   * 이걸 effect 의존성에 그대로 두면 부모가 리렌더될 때마다 effect가 다시 돌고,
   * 그때 panelRef.focus()가 시트 안 입력창의 포커스를 빼앗는다.
   * → 메모처럼 시트 안에서 타이핑하면 **한 글자마다 입력이 끊긴다.**
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // ESC로 닫기 — onClose를 ref로 읽어 effect가 매 렌더마다 재등록되지 않게 한다
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // 포커스는 **열릴 때 한 번만** 옮긴다 (열림 상태가 바뀔 때만 실행)
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        aria-label="닫기"
        className={`absolute inset-0 ${
          tone === "board" ? "bg-black/40 backdrop-blur-[4px]" : "bg-secondary/40"
        }`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full max-w-[420px] p-5 pb-[max(20px,env(safe-area-inset-bottom))] outline-none [animation:sheet-up_.22s_ease] ${
          tone === "board"
            ? "rounded-t-3xl bg-[#25411A] shadow-[0_-8px_16px_rgba(0,19,43,.28)]"
            : "rounded-t-card bg-white shadow-[0_-2px_12px_rgba(26,51,0,0.10)]"
        }`}
      >
        <div
          className={`mx-auto mb-4 h-1 w-10 rounded-full ${
            tone === "board" ? "bg-[rgba(242,245,239,.35)]" : "bg-hairline"
          }`}
          aria-hidden
        />
        {title && (
          <p
            className={`text-center text-[16px] font-bold ${
              tone === "board" ? "text-[#F2F5EF]" : "text-rd-ink"
            }`}
          >
            {title}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
