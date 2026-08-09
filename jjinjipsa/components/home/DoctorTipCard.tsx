"use client";

/*
 * 냥박사 한마디 — 카드 스택에서 유일하게 무드 색을 쓰는 곳.
 * 배경은 무드의 가장 어두운 톤(deep)이라 카드 스택 안에서 하나만 눈에 띈다.
 */

import Link from "next/link";
import { tipOf, type Mood } from "@/lib/homeMood";

export default function DoctorTipCard({
  mood,
  href,
}: {
  mood: Mood;
  href: string;
}) {
  return (
    <section
      className="rounded-3xl p-5 text-white"
      style={{ background: mood.deep }}
    >
      <p className="mb-2 text-[12px] font-semibold text-white/60">냥박사 한마디</p>
      <p className="mb-3.5 text-[15.5px] leading-[1.5] font-semibold tracking-[-0.02em] text-pretty">
        {tipOf(mood)}
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2.5 text-[13px] font-semibold"
      >
        냥박사한테 물어보기 →
      </Link>
    </section>
  );
}
