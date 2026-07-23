"use client";

/* 고양이 선택 바텀시트 — 현재 선택 강조 + 다른 아이 등록 (지시서 §5) */

import Link from "next/link";
import BottomSheet from "@/components/BottomSheet";
import { getCatAge } from "@/lib/catAge";
import type { Cat } from "@/lib/storage";

export default function CatSelectorSheet({
  open,
  cats,
  selectedId,
  onSelect,
  onClose,
}: {
  open: boolean;
  cats: Cat[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="어떤 아이를 볼까요?">
      <div className="space-y-2">
        {cats.map((c) => {
          const on = c.id === selectedId;
          const age = getCatAge(c.birthDate);
          return (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-card border p-3 text-left transition ${
                on ? "border-primary bg-primary/10" : "border-hairline bg-white"
              }`}
            >
              {c.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.photo}
                  alt={`${c.name} 프로필 사진`}
                  className="size-11 flex-none rounded-[14px] object-cover"
                />
              ) : (
                <span className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-surface-soft text-xl">
                  🐱
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-secondary">
                  {c.name}
                </span>
                <span className="block truncate text-[12px] text-muted">
                  {age.ageLabel} · {c.breedGroup}
                </span>
              </span>
              {on && <span className="flex-none text-primary-deep">✓</span>}
            </button>
          );
        })}
      </div>

      {cats.length < 3 && (
        <Link
          href="/profile/new"
          onClick={onClose}
          className="mt-3 flex h-12 items-center justify-center rounded-button border border-dashed border-hairline text-sm font-semibold text-muted"
        >
          + 다른 아이 등록
        </Link>
      )}
    </BottomSheet>
  );
}
