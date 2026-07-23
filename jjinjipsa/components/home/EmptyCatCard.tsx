"use client";

/* 고양이 미등록 상태 안내 카드 — 빈 상태 마스코트 (지시서 §5·§15A) */

import Link from "next/link";
import Mascot from "@/components/Mascot";

export default function EmptyCatCard() {
  return (
    <section className="rounded-card border border-hairline bg-white p-6 text-center">
      <Mascot mood="empty" size={92} className="mx-auto" />
      <p className="display mt-2 text-[19px] text-secondary">
        우리 고양이를 소개해 주세요
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-body">
        이름과 나이만 등록하면
        <br />
        냥박사가 맞춤 상담을 시작해요.
      </p>
      <Link
        href="/profile/new"
        className="mt-5 flex h-12 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(255,141,123,0.35)] active:scale-[0.99]"
      >
        고양이 등록하기
      </Link>
    </section>
  );
}
