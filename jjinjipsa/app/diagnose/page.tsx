"use client";

/* 사진 진단 탭 — 큰 CTA (사진 첨부 챗 연동은 Phase 3) */

import Link from "next/link";
import { useEffect, useState } from "react";
import { type Cat } from "@/lib/storage";
import { resolveSelectedCat } from "@/lib/selectedCat";

export default function Diagnose() {
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  useEffect(() => {
    void resolveSelectedCat().then((c) => setCat(c));
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-8 pb-6">
      <h1 className="display text-[22px] text-secondary">사진으로 건강 확인</h1>

      <section className="rounded-card bg-primary p-7 text-secondary shadow-[0_4px_20px_rgba(246,179,82,0.35)]">
        <p className="text-4xl">📷</p>
        <p className="mt-3 text-xl font-bold">사진으로 건강 확인하기</p>
        <p className="mt-1 text-[14px] opacity-85">
          눈·피부·귀·토사물 등을 사진 한 장으로 냥박사가 살펴봐요.
        </p>
        {cat ? (
          <Link
            href={`/cats/${cat.id}/chat?photo=1`}
            className="mt-5 flex h-12 items-center justify-center rounded-button bg-white text-sm font-bold text-secondary"
          >
            📷 사진 찍기 / 올리기
          </Link>
        ) : (
          <Link
            href="/profile/new"
            className="mt-5 flex h-12 items-center justify-center rounded-button bg-white text-sm font-bold text-secondary"
          >
            먼저 우리 아이 등록하기
          </Link>
        )}
      </section>

      <ul className="space-y-2 text-[13px] text-body">
        <li className="rounded-md bg-surface-soft px-4 py-3">👁️ 눈곱·충혈·눈물 자국</li>
        <li className="rounded-md bg-surface-soft px-4 py-3">🐾 피부·털 빠짐·각질</li>
        <li className="rounded-md bg-surface-soft px-4 py-3">👂 귀 안쪽·귀지</li>
        <li className="rounded-md bg-surface-soft px-4 py-3">🤢 토사물·대변 상태</li>
      </ul>

      <p className="text-center text-[11px] text-muted-soft">
        사진 진단은 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
      </p>
    </main>
  );
}
