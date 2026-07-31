"use client";

/*
 * 냥이 생활기록부 — 자랑용 공유 카드 (D-20).
 *
 * 건강 카드(HealthCard)와 **역할이 다르다.**
 *   - 건강 카드: 병원·펫시터용. 증상·기저조건이 들어간다. 공개 공유용이 아니다
 *   - 생활기록부: SNS 자랑용. 성격만 담고 **건강 정보는 한 줄도 넣지 않는다**
 * 이 파일에 체중·증상·판정을 추가하고 싶어지면, 그건 건강 카드가 할 일이다.
 *
 * 이미지 캡처 대상이라 배경·스타일이 자체 완결이어야 한다(외부 배경 의존 금지).
 */

import { forwardRef } from "react";
import { getCatAge } from "@/lib/catAge";
import { GRADE_STYLE, type ReportRow, type ReportSummary } from "@/lib/personality";
import { IconCat } from "@/components/icons";
import type { Cat } from "@/lib/storage";

/** 등록일을 '입학'으로 읽는다 — 앱에 온 날이지 입양일이 아니므로 연도만 쓴다 */
function enrollYear(cat: Cat): string {
  return cat.createdAt.slice(0, 4);
}

const ReportCard = forwardRef<
  HTMLDivElement,
  { cat: Cat; rows: ReportRow[]; summary: ReportSummary }
>(function ReportCard({ cat, rows, summary }, ref) {
  const age = getCatAge(cat.birthDate);
  const filled = rows.filter((r) => r.answered);

  return (
    <div ref={ref} className="w-full overflow-hidden rounded-card bg-white">
      {/* 표제 — 학교 양식의 딱딱함이 이 카드의 농담이다 */}
      <div className="border-b-[3px] border-double border-secondary/70 bg-surface-soft/60 px-5 py-4 text-center">
        {/* 한글은 자간을 크게 벌리면 글자가 흩어져 보인다 — 1px까지만 */}
        <p className="text-[11px] font-semibold tracking-[1px] text-muted">
          찐집사 부설 냥이학교
        </p>
        <p className="display mt-0.5 text-[19px] text-secondary">
          {new Date().getFullYear()}학년도 생활기록부
        </p>
      </div>

      <div className="space-y-4 p-5">
        {/* 인적사항 */}
        <div className="flex items-center gap-3.5">
          {cat.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.photo}
              alt={`${cat.name} 사진`}
              className="size-[72px] flex-none rounded-[14px] border border-hairline object-cover"
            />
          ) : (
            <span className="flex size-[72px] flex-none items-center justify-center rounded-[14px] border border-hairline bg-surface-soft text-muted-soft">
              <IconCat size={36} />
            </span>
          )}
          <dl className="min-w-0 flex-1 space-y-0.5 text-[12.5px]">
            <div className="flex gap-2">
              <dt className="w-11 flex-none text-muted">성명</dt>
              <dd className="font-bold text-secondary">{cat.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-11 flex-none text-muted">학년</dt>
              <dd className="text-body">
                {age.stageLabel} · {age.ageLabel}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-11 flex-none text-muted">입학</dt>
              <dd className="text-body">
                {enrollYear(cat)}년 · {cat.breedGroup}
              </dd>
            </div>
          </dl>
        </div>

        {/* 행동발달상황 — 등급이 나가는 칸 */}
        <div>
          <p className="border-b border-hairline pb-1.5 text-[12px] font-bold text-secondary">
            ■ 행동발달상황
          </p>
          {filled.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-muted">
              아직 기재된 항목이 없어요.
            </p>
          ) : (
            <ul className="mt-1">
              {filled.map((r) => (
                <li
                  key={r.key}
                  className="flex items-center gap-2.5 border-b border-hairline/60 py-[7px] last:border-0"
                >
                  <span className="w-[74px] flex-none text-[12px] font-semibold text-secondary">
                    {r.key}
                  </span>
                  <span
                    className={`flex-none rounded-[6px] px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      GRADE_STYLE[r.answered!.grade]
                    }`}
                  >
                    {r.answered!.grade}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-body">
                    {r.answered!.note}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 담임 의견 */}
        <div className="rounded-[14px] border border-soft-pink bg-primary-soft p-3.5">
          <p className="text-[12px] font-bold text-primary-deep">
            ■ 담임 의견 <span className="font-semibold">(냥박사)</span>
          </p>
          {summary.type && (
            <p className="mt-1.5 text-[13.5px] font-bold text-secondary">
              “{summary.type}”
            </p>
          )}
          <p className="mt-1 text-[12.5px] leading-relaxed text-secondary">
            {summary.comment}
          </p>
        </div>

        <p className="border-t border-hairline pt-3 text-center text-[10.5px] text-muted-soft">
          찐집사에서 발급 · 성격 기록이며 건강 정보는 포함하지 않습니다
        </p>
      </div>
    </div>
  );
});

export default ReportCard;
