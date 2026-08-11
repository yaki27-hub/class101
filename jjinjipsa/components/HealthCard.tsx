"use client";

/*
 * 진료 준비 카드 (지시서 P1-4) — 병원 접수대에서 한 장으로 보여주는 요약.
 *
 * 이름을 "건강 카드"에서 바꾼 이유: 목적이 건강 상태를 알려주는 게 아니라
 * **진료 때 말할 것을 빠짐없이 꺼내주는** 것이기 때문이다. 그래서 담는 것도
 * 수의사가 먼저 묻는 순서에 맞춘다 — 기본 정보 → 체중 → 복용약·알레르기(꼭 기억할 것)
 * → 기저질환 → 오늘 상태 → 최근 30일 증상.
 *
 * 이미지 캡처 대상이라 배경/스타일 자체 완결 (외부 배경 의존 금지).
 */

import { forwardRef } from "react";
import { getCatAge } from "@/lib/catAge";
import { STATUS_ITEMS, type DailyRecord } from "@/lib/dailyStatus";
import { IconCat } from "@/components/icons";
import type { Cat, SymptomLog, WeightLog } from "@/lib/storage";

/** 진료 준비 카드가 훑는 기간 — 30일 (지시서 P1-4) */
const RECENT_DAYS = 30;

const HealthCard = forwardRef<
  HTMLDivElement,
  {
    cat: Cat;
    note: string;
    record: DailyRecord;
    logs: SymptomLog[];
    /** 체중 기록 (오래된→최신). 최신값과 직전 대비 변화를 보여준다 */
    weights?: WeightLog[];
    dateStr: string;
  }
>(function HealthCard({ cat, note, record, logs, weights = [], dateStr }, ref) {
  const age = getCatAge(cat.birthDate);
  const todayItems = STATUS_ITEMS.map((it) => ({ it, v: record[it.key] })).filter(
    (x) => x.v,
  );

  // 최근 30일 증상 — 전체 기록에서 기간으로 자른다 (오래된 기록이 섞이면 진료 때 혼선)
  const since = new Date();
  since.setDate(since.getDate() - RECENT_DAYS);
  const sinceKey = since.toISOString().slice(0, 10);
  const recentLogs = logs
    .filter((l) => l.occurredAt.slice(0, 10) >= sinceKey)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

  const sortedW = [...weights].sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
  const latestW = sortedW[sortedW.length - 1] ?? null;
  const prevW = sortedW.length > 1 ? sortedW[sortedW.length - 2] : null;
  const deltaW = latestW && prevW ? Number((latestW.weightKg - prevW.weightKg).toFixed(2)) : null;

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden rounded-card border border-hairline bg-white"
    >
      {/* 상단 브랜드 스트립 */}
      <div className="flex items-center justify-between bg-primary-soft px-5 py-3">
        <span className="display text-[15px] text-primary-deep">🐾 진료 준비 카드</span>
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

        {/* 체중 — 진료에서 가장 먼저 확인하는 수치 */}
        {latestW && (
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-semibold text-secondary">체중</span>
            <span className="text-[13.5px] font-bold text-secondary tabular-nums">
              {latestW.weightKg}kg
            </span>
            <span className="text-[11.5px] text-muted tabular-nums">
              {latestW.measuredAt.slice(5).replace("-", "/")} 기준
              {deltaW !== null && prevW && (
                <>
                  {" · 직전 "}
                  {prevW.weightKg}kg({prevW.measuredAt.slice(5).replace("-", "/")})
                  {" 대비 "}
                  {deltaW > 0 ? "+" : ""}
                  {deltaW}kg
                </>
              )}
            </span>
          </div>
        )}

        {cat.conditions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-semibold text-secondary">기존 질환</span>
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
            <p className="text-[12px] font-bold text-primary-deep">
              📌 꼭 기억할 것 <span className="font-semibold">(복용약 · 알레르기 등)</span>
            </p>
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
                        ? "bg-butter-soft text-warning"
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

        {/* 최근 30일 증상 — 병원에서 "언제부터"를 묻는다 */}
        {recentLogs.length > 0 && (
          <div>
            <p className="text-[12px] font-bold text-secondary">
              최근 30일 증상{" "}
              <span className="font-semibold text-muted">({recentLogs.length}건)</span>
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {recentLogs.slice(0, 5).map((l) => (
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

        {recentLogs.length > 5 && (
          <p className="-mt-2 text-[11px] text-muted">
            외 {recentLogs.length - 5}건은 앱의 증상 기록에서 볼 수 있어요.
          </p>
        )}

        <p className="border-t border-hairline pt-3 text-center text-[10.5px] text-muted-soft">
          찐집사에서 작성 · 참고용이며 정확한 진단은 수의사 상담이 필요합니다
        </p>
      </div>
    </div>
  );
});

export default HealthCard;
