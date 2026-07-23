"use client";

/* 공용 바텀시트 — ESC/배경 클릭으로 닫힘, 열리면 내부 포커스 (접근성 §18) */

import { useEffect, useRef } from "react";

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
        className="absolute inset-0 bg-secondary/40"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-[420px] rounded-t-card bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(122,92,67,0.14)] outline-none [animation:sheet-up_.22s_ease]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-hairline" aria-hidden />
        {title && (
          <p className="text-center text-[16px] font-bold text-secondary">{title}</p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
