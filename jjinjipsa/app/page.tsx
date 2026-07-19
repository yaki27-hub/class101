"use client";

/* 홈 — 등록된 고양이 목록 + 첫 등록 CTA (챗봇 중심 홈 F-03'은 M2에서 완성) */

import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";

export default function Home() {
  const [cats, setCats] = useState<Cat[] | null>(null);

  useEffect(() => {
    void storage.listCats().then(setCats);
  }, []);

  return (
    <main className="flex flex-1 flex-col px-5 py-10">
      <header className="mb-8">
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Jjinjipsa
        </p>
        <h1 className="display mt-2 text-[28px] text-ink">
          갑자기 시작된 인연도,
          <br />
          오래도록 걱정 없이.
        </h1>
        <p className="mt-2 text-sm text-body">
          내 고양이를 기억하는 건강 챗봇, 찐집사
        </p>
      </header>

      {cats === null ? null : cats.length === 0 ? (
        <div className="rounded-xl bg-brand-peach p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-ink/60">
            시작하기
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            아직 등록된 아이가 없어요
          </p>
          <p className="mt-1 text-sm text-ink/70">
            1분이면 끝나요. 프로필을 등록하면 나이 환산부터 바로 보여드려요.
          </p>
          <Link
            href="/profile/new"
            className="mt-4 flex h-11 items-center justify-center rounded-md bg-canvas text-sm font-semibold text-ink"
          >
            우리 아이 등록하기 🐾
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cats.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border border-hairline bg-canvas p-4"
            >
              <p className="text-base font-semibold text-ink">🐈 {cat.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {cat.breedGroup}
                {cat.weightKg ? ` · ${cat.weightKg}kg` : ""}
                {cat.conditions.length > 0
                  ? ` · ${cat.conditions.join(", ")}`
                  : ""}
              </p>
            </div>
          ))}
          <Link
            href="/profile/new"
            className="flex h-11 items-center justify-center rounded-md border border-hairline bg-canvas text-sm font-semibold text-body"
          >
            + 다른 아이 등록
          </Link>
        </div>
      )}

      <p className="mt-auto pt-10 text-center text-xs text-muted-soft">
        이 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
      </p>
    </main>
  );
}
