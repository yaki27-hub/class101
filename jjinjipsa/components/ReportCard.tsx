"use client";

/*
 * 냥이 생활기록부 — 자랑용 공유 카드 (D-20, 리디자인 핸드오프 반영).
 *
 * 건강 카드(HealthCard)와 **역할이 다르다.**
 *   - 건강 카드: 병원·펫시터용. 증상·기저조건이 들어간다. 공개 공유용이 아니다
 *   - 생활기록부: SNS 자랑용. 성격만 담고 **건강 정보는 한 줄도 넣지 않는다**
 * 이 파일에 체중·증상·판정을 추가하고 싶어지면, 그건 건강 카드가 할 일이다.
 *
 * 리디자인 골자 — 같은 12항목이 세 번 반복되던 화면을 요약→근거 순서로:
 *   유형 헤드라인(인적사항 옆 승격) → 오각 레이더 → 담임 의견 → 행동발달상황.
 * 행동발달상황 줄은 직접 눌러 수정한다 (onEdit) — 별도 "고치기" 목록이 없다.
 *
 * 이미지 캡처 대상이라 배경·스타일이 자체 완결이어야 한다(외부 배경 의존 금지).
 * 색은 토큰 대신 hex — 캡처 시 어떤 테마 컨텍스트에서도 같은 그림이 나온다.
 */

import { forwardRef } from "react";
import { getCatAge } from "@/lib/catAge";
import {
  GRADE_STYLE,
  radarAxes,
  type PersonalityQuestion,
  type ReportRow,
  type ReportSummary,
} from "@/lib/personality";
import PersonalityRadar from "@/components/PersonalityRadar";
import { IconCat } from "@/components/icons";
import type { Cat } from "@/lib/storage";

const ReportCard = forwardRef<
  HTMLDivElement,
  {
    cat: Cat;
    rows: ReportRow[];
    summary: ReportSummary;
    /** 행동발달상황 줄 탭 → 해당 문항 수정 시트. 없으면 읽기 전용 */
    onEdit?: (q: PersonalityQuestion) => void;
  }
>(function ReportCard({ cat, rows, summary, onEdit }, ref) {
  const age = getCatAge(cat.birthDate);
  const filled = rows.filter((r) => r.answered);
  const axes = radarAxes(rows);

  return (
    <div ref={ref} className="w-full overflow-hidden rounded-3xl bg-white">
      {/* 표제 밴드 — 학교 양식의 딱딱함이 이 카드의 농담이다 */}
      <div className="border-b-[3px] border-double border-[#D8DDD6] bg-[#FAFBF8] px-5 py-[15px] text-center">
        {/* 한글은 자간을 크게 벌리면 글자가 흩어져 보인다 — 1px까지만 */}
        <p className="text-[11px] font-semibold tracking-[1px] text-[#9AA09B]">
          찐집사 부설 냥이학교
        </p>
        <p className="display mt-[3px] text-[19px] text-[#1A1A1A]">
          {new Date().getFullYear()}학년도 생활기록부
        </p>
      </div>

      <div className="grid gap-[18px] p-5">
        {/* 인적사항 + 유형 헤드라인 */}
        <div className="flex items-center gap-[14px]">
          {cat.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cat.photo}
              alt={`${cat.name} 사진`}
              className="size-16 flex-none rounded-2xl bg-[#EFF1ED] object-cover"
            />
          ) : (
            <span className="flex size-16 flex-none items-center justify-center rounded-2xl bg-[#EFF1ED] text-[#9AA09B]">
              <IconCat size={32} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-[#9AA09B]">
              {cat.name} · {age.stageLabel} {age.ageLabel} · {cat.breedGroup}
            </p>
            {summary.type && (
              <p className="display mt-[5px] text-[22px] leading-[1.25] tracking-[-0.01em] text-[#1A1A1A]">
                {summary.type}
              </p>
            )}
          </div>
        </div>

        {/* 성격 레이더 */}
        <div className="rounded-2xl bg-[#F7F8F5] pt-[14px] pb-[10px] px-[10px]">
          <PersonalityRadar axes={axes} />
        </div>

        {/* 담임 의견 — 안심시키는 문구라 그린 계열 (붉은색은 이 화면 어디에도 없다) */}
        <div className="rounded-2xl border border-[#C8E3D8] bg-[#EDF6F2] p-[15px]">
          <p className="mb-[7px] text-[12px] font-extrabold text-[#0E5B41]">
            담임 의견 · 냥박사
          </p>
          <p className="text-[13px] leading-[1.7] tracking-[-0.01em] text-[#26332D] text-pretty">
            {summary.comment}
          </p>
        </div>

        {/* 행동발달상황 — 답한 칸만, 줄을 눌러 고친다 */}
        <div>
          <div className="flex items-center justify-between border-b border-[#ECEEE9] pb-2">
            <p className="text-[12.5px] font-extrabold text-[#1A1A1A]">
              행동발달상황
            </p>
            {onEdit && filled.length > 0 && (
              <p className="text-[11.5px] font-semibold text-[#9AA09B]">
                누르면 고칠 수 있어요
              </p>
            )}
          </div>
          {filled.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-[#9AA09B]">
              아직 기재된 항목이 없어요
            </p>
          ) : (
            <ul>
              {filled.map((r) => {
                const inner = (
                  <>
                    <span className="w-[76px] flex-none break-keep text-left text-[12.5px] font-bold tracking-[-0.01em] text-[#1A1A1A]">
                      {r.key}
                    </span>
                    <span
                      className={`w-[26px] flex-none rounded-[6px] py-[2px] text-center text-[11px] font-extrabold ${GRADE_STYLE[r.answered!.grade]}`}
                    >
                      {r.answered!.grade}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left text-[12.5px] text-[#3F4642]">
                      {r.answered!.note}
                    </span>
                  </>
                );
                return (
                  <li
                    key={r.key}
                    className="border-b border-[#F4F5F1] last:border-0"
                  >
                    {onEdit ? (
                      <button
                        type="button"
                        onClick={() => onEdit(r.question)}
                        className="flex w-full items-center gap-2.5 py-[9px] active:opacity-70"
                      >
                        {inner}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2.5 py-[9px]">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 발급 푸터 */}
        <p className="border-t border-[#ECEEE9] pt-[14px] text-center text-[10.5px] text-[#B4BAB5]">
          찐집사에서 발급 · 성격 기록이며 건강 정보는 포함하지 않습니다
        </p>
      </div>
    </div>
  );
});

export default ReportCard;
