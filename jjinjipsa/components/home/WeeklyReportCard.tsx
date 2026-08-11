"use client";

/*
 * 주간 리포트 진입점 (지시서 P1-2) — 기록이 일정량 쌓였을 때만 뜬다.
 *
 * 기록이 하루뿐인데 "이번 주는 어땠을까요?"를 띄우면, 열어봤자 "비교하기 어려워요"만
 * 나와서 첫인상이 빈 화면이 된다. 최소 기록일은 lib/weeklyReport의 MIN_RECORD_DAYS
 * 상수로 두고 실제 사용 패턴을 보고 조정한다.
 */

import Link from "next/link";

export default function WeeklyReportCard({
  catId,
  catName,
  recordedDays,
}: {
  catId: string;
  catName: string;
  recordedDays: number;
}) {
  return (
    <Link
      href={`/cats/${catId}/weekly`}
      className="flex items-center gap-3 rounded-3xl bg-rd-card p-5 active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
          이번 주 {catName}는 어땠을까요?
        </span>
        <span className="mt-1 block text-[12.5px] text-rd-muted tabular-nums">
          최근 7일 중 {recordedDays}일 기록 · 주간 리포트 보기
        </span>
      </span>
      <span aria-hidden className="flex-none text-[18px] text-rd-forest">
        ›
      </span>
    </Link>
  );
}
