"use client";

/* 고양이 미등록 상태 안내 카드 (지시서 §5·§15A) */

import Link from "next/link";

export default function EmptyCatCard() {
  return (
    <section className="rounded-card border border-hairline bg-white p-6 text-center">
      <p className="text-4xl">🐱</p>
      <p className="mt-3 text-[18px] font-bold text-secondary">
        우리 고양이를 소개해 주세요
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-body">
        이름과 나이만 등록하면
        <br />
        냥박사가 맞춤 상담을 시작해요.
      </p>
      <Link
        href="/profile/new"
        className="mt-5 flex h-12 items-center justify-center rounded-button bg-primary text-[15px] font-bold text-white active:scale-[0.99]"
      >
        고양이 등록하기
      </Link>
    </section>
  );
}
