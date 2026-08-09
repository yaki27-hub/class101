"use client";

/*
 * 냥박사 탭 — 지난 상담 이력 + 새 질문 진입 (docs/정보구조.md 1단계).
 *
 * 전에는 17줄짜리 리다이렉트라 탭에 고유 화면이 없었고, 지난 판정을 다시 볼
 * 방법도 없었다. 이 화면이 '지난 상담'을 소유한다.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import { getSelectedCatId, setSelectedCatId } from "@/lib/selectedCat";
import {
  formatConsultDate,
  listRecentConsults,
  VERDICT_STYLE,
  type ConsultEntry,
} from "@/lib/chatHistory";
import { accentAt } from "@/lib/catColor";
import CatAvatar from "@/components/CatAvatar";
import Mascot from "@/components/Mascot";

export default function DoctorTab() {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [selectedId, setSelected] = useState<string | null>(null);
  const [consults, setConsults] = useState<ConsultEntry[] | null>(null);

  useEffect(() => {
    void (async () => {
      const list = await storage.listCats();
      setCats(list);
      const saved = getSelectedCatId();
      setSelected(list.find((c) => c.id === saved)?.id ?? list[0]?.id ?? null);
      setConsults(await listRecentConsults());
    })();
  }, []);

  if (cats === null || consults === null) return null;

  // 등록된 고양이가 없으면 먼저 등록부터
  if (cats.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pb-24 text-center">
        <Mascot mood="calm" size={92} />
        <h1 className="display text-[20px] text-rd-ink">
          먼저 우리 아이를 알려주세요
        </h1>
        <p className="text-sm leading-relaxed text-rd-body">
          나이와 기록을 알아야 냥박사가
          <br />
          맞춤으로 답해드릴 수 있어요.
        </p>
        <Link
          href="/profile/new"
          className="mt-1 flex h-12 w-full max-w-[280px] items-center justify-center rounded-[14px] bg-rd-ink text-sm font-bold text-white"
        >
          고양이 등록하기
        </Link>
      </main>
    );
  }

  const selected = cats.find((c) => c.id === selectedId) ?? cats[0];

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 pt-8 pb-24">
      <header>
        <h1 className="display text-[22px] text-rd-ink">냥박사</h1>
        <p className="mt-1 text-[13px] text-rd-body">
          {selected.name}의 나이와 기록을 알고 답해드려요.
        </p>
      </header>

      {/* 어느 아이로 물어볼지 — 여러 마리일 때만 */}
      {cats.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map((c, i) => {
            const on = c.id === selected.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelected(c.id);
                  setSelectedCatId(c.id);
                }}
                className={`flex flex-none items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-semibold ${
                  on
                    ? "border-rd-mint-line bg-rd-mint-soft text-rd-forest"
                    : "border-rd-line bg-white text-rd-body"
                }`}
              >
                <CatAvatar cat={c} size={22} accent={accentAt(i)} />
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* 새 질문 — 이 탭의 주 행동 */}
      <Link
        href={`/cats/${selected.id}/chat`}
        className="flex items-center gap-3 rounded-3xl bg-rd-card p-4 active:scale-[0.99]"
      >
        <span className="flex size-12 flex-none items-center justify-center rounded-full bg-rd-mint-soft">
          <Mascot mood="calm" size={34} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-rd-ink">
            무엇이든 물어보세요
          </span>
          <span className="block text-[12.5px] text-rd-muted">
            사료·행동·건강 신호까지 살펴드려요
          </span>
        </span>
        <span aria-hidden className="text-rd-muted">
          ›
        </span>
      </Link>

      {/* 지난 상담 — 이 화면이 소유하는 정보 */}
      <section>
        <h2 className="px-1 text-[13px] font-bold text-rd-ink">지난 상담</h2>

        {consults.length === 0 ? (
          <p className="mt-2 rounded-3xl bg-rd-card px-4 py-6 text-center text-[13px] leading-relaxed text-rd-muted">
            아직 상담 기록이 없어요.
            <br />
            궁금한 걸 물어보면 여기에 쌓여요.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {consults.map((c) => {
              const style = c.verdict ? VERDICT_STYLE[c.verdict] : null;
              return (
                <li key={c.id}>
                  <Link
                    href={`/cats/${c.catId}/chat`}
                    className="flex items-start gap-3 rounded-3xl bg-rd-card px-4 py-3 active:scale-[0.99]"
                  >
                    {style && (
                      <span
                        aria-hidden
                        className={`mt-1.5 size-2 flex-none rounded-full ${style.dot}`}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-rd-ink">
                        {c.question || "상담 기록"}
                      </span>
                      <span className="mt-0.5 block text-[12px] text-rd-muted">
                        {cats.length > 1 && `${c.catName} · `}
                        {formatConsultDate(c.createdAt)}
                        {style && ` · ${style.short}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-center text-[11px] leading-relaxed text-rd-faint">
        참고 정보이며, 진단·처방은 수의사의 영역이에요.
      </p>
    </main>
  );
}
