"use client";

/* 최근 기록 — 홈엔 최대 2개, 전체는 기록 탭으로 (지시서 §8) */

import Link from "next/link";
import Mascot from "@/components/Mascot";
import type { SymptomLog } from "@/lib/storage";

function fmtDate(iso: string): string {
  const m = iso.slice(5, 7);
  const d = iso.slice(8, 10);
  return `${Number(m)}월 ${Number(d)}일`;
}

export default function RecentRecordsSection({ rows }: { rows: SymptomLog[] }) {
  return (
    <section>
      <div className="flex items-center justify-between px-1">
        <p className="display text-[18px] text-secondary">최근 기록</p>
        {rows.length > 0 && (
          <Link href="/records" className="text-[13px] font-semibold text-muted">
            전체보기 ›
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-2 rounded-card border border-hairline bg-white p-6 text-center">
          <Mascot mood="empty" size={64} className="mx-auto" />
          <p className="mt-2 text-[14px] font-bold text-secondary">
            아직 건강 기록이 없어요
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-body">
            상담과 일상 기록이 쌓이면
            <br />
            평소와 달라진 점을 확인할 수 있어요.
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((log) => (
            <Link
              key={log.id}
              href="/records"
              className="block rounded-card border border-hairline bg-white p-4"
            >
              <p className="text-[12px] text-muted">{fmtDate(log.occurredAt)}</p>
              <p className="mt-1 flex flex-wrap gap-1">
                {log.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-soft-pink px-2 py-0.5 text-[11px] font-semibold text-secondary"
                  >
                    #{t}
                  </span>
                ))}
              </p>
              <p className="mt-1 truncate text-[13px] text-body">{log.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
