"use client";

/* 건강 요약 카드 — 병원·펫시터 공유용 한 장. 이미지 캡처 대상이라 배경/스타일 자체 완결. */

import { forwardRef } from "react";
import { getCatAge } from "@/lib/catAge";
import { STATUS_ITEMS, type DailyRecord } from "@/lib/dailyStatus";
import { IconCat } from "@/components/icons";
import type { Cat, SymptomLog } from "@/lib/storage";

const HealthCard = forwardRef<
  HTMLDivElement,
  { cat: Cat; note: string; record: DailyRecord; logs: SymptomLog[]; dateStr: string }
>(function HealthCard({ cat, note, record, logs, dateStr }, ref) {
  const age = getCatAge(cat.birthDate);
  const todayItems = STATUS_ITEMS.map((it) => ({ it, v: record[it.key] })).filter(
    (x) => x.v,
  );

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden rounded-card border border-hairline bg-white"
    >
      {/* 상단 브랜드 스트립 */}
      <div className="flex items-center justify-between bg-primary-soft px-5 py-3">
        <span className="display text-[15px] text-primary-deep">🐾 건강 카드</span>
        <span className="text-[11px] font-semibold text-primary-deep">{dateStr}</span>
      </div>

      <div className="space-y-4 p-5">
        {/* 기본 정보 */}
        <div className="flex items-center gap-3">
          {cat.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.photo}
              alt={`${cat.name} 사진`}
              className="size-16 flex-none rounded-[18px] object-cover"
            />
          ) : (
            <span className="flex size-16 flex-none items-center justify-center rounded-[18px] bg-surface-soft text-muted-soft">
              <IconCat size={34} />
            </span>
          )}
          <div className="min-w-0">
            <p className="display text-[20px] text-secondary">{cat.name}</p>
            <p className="text-[12.5px] text-body">
              {age.ageLabel}
              {cat.birthEstimated ? "(추정)" : ""} · 사람 나이 {age.humanAge}세 ·{" "}
              {age.stageLabel}
            </p>
            <p className="text-[12px] text-muted">
              {cat.breedGroup}
              {cat.weightKg ? ` · ${cat.weightKg}kg` : ""} ·{" "}
              {cat.neutered ? "중성화 완료" : "중성화 안 함"}
            </p>
          </div>
        </div>

        {cat.conditions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-semibold text-secondary">기저조건</span>
            {cat.conditions.map((c) => (
              <span
                key={c}
                className="rounded-full bg-sky-soft px-2.5 py-1 text-[11px] font-semibold text-sky-ink"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* 꼭 기억할 것 */}
        {note.trim() && (
          <div className="rounded-[14px] border border-soft-pink bg-primary-soft p-3.5">
            <p className="text-[12px] font-bold text-primary-deep">📌 꼭 기억할 것</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-secondary">
              {note.trim()}
            </p>
          </div>
        )}

        {/* 오늘 상태 */}
        {todayItems.length > 0 && (
          <div>
            <p className="text-[12px] font-bold text-secondary">오늘 상태</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {todayItems.map(({ it, v }) => {
                const abnormal = v!.level === "warning" || v!.level === "danger";
                return (
                  <span
                    key={it.key}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      abnormal
                        ? "bg-[#fff4ec] text-[#b8862e]"
                        : "bg-mint-soft text-success"
                    }`}
                  >
                    {it.label} · {v!.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 최근 증상 */}
        {logs.length > 0 && (
          <div>
            <p className="text-[12px] font-bold text-secondary">최근 증상</p>
            <ul className="mt-1.5 space-y-1.5">
              {logs.slice(0, 3).map((l) => (
                <li key={l.id} className="flex items-start gap-2 text-[12.5px]">
                  <span className="mt-0.5 whitespace-nowrap text-[11px] text-muted">
                    {l.occurredAt.slice(5, 10).replace("-", "/")}
                  </span>
                  <span className="min-w-0">
                    <span className="mr-1 font-semibold text-secondary">
                      {l.tags.map((t) => `#${t}`).join(" ")}
                    </span>
                    <span className="text-body">{l.summary}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="border-t border-hairline pt-3 text-center text-[10.5px] text-muted-soft">
          찐집사에서 작성 · 참고용이며 정확한 진단은 수의사 상담이 필요합니다
        </p>
      </div>
    </div>
  );
});

export default HealthCard;
