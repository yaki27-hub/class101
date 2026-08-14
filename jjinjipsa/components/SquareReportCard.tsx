"use client";

/*
 * SNS용 1:1 생활기록부 카드 (지시서 P2-3).
 *
 * 긴 기록부(ReportCard)와 **역할이 다르다.** 긴 카드는 12줄을 다 보여주는 문서고,
 * 이것은 피드에서 1초 안에 읽히는 한 장이다. 그래서 담는 것은 유형 한 줄 + 별점 몇 개 +
 * 담임 의견 두 줄까지다. 더 넣으면 정사각 안에서 글자가 작아져 아무도 안 읽는다.
 *
 * 별점은 기존 5등급(D·C·B·A·A+)을 그대로 옮긴 것이다 — 새 점수 체계를 만들지 않는다.
 * **답하지 않은 축은 아예 빼고** 보여준다. 빈 별로 채우면 "이 아이는 애교가 없다"는
 * 말이 되는데, 사실은 아직 안 적었을 뿐이다.
 *
 * 캡처 대상이라 색·배경이 자체 완결이어야 한다 (외부 배경 의존 금지).
 */

import { forwardRef } from "react";
import { radarAxes, type ReportRow, type ReportSummary } from "@/lib/personality";
import { IconCat } from "@/components/icons";
import type { Cat } from "@/lib/storage";

/** 0~4 평균 → 별 1~5개 (D=★, A+=★★★★★) */
function stars(avg: number): number {
  return Math.min(5, Math.max(1, Math.round(avg) + 1));
}

const SquareReportCard = forwardRef<
  HTMLDivElement,
  { cat: Cat; rows: ReportRow[]; summary: ReportSummary }
>(function SquareReportCard({ cat, rows, summary }, ref) {
  const axes = radarAxes(rows).filter((a) => a.avg !== null);

  return (
    <div
      ref={ref}
      className="relative flex aspect-square w-full flex-col justify-between overflow-hidden p-6"
      style={{ background: "#FAFBF8" }}
    >
      {/* 표제 */}
      <div>
        <p
          className="text-[11px] font-semibold"
          style={{ letterSpacing: "1px", color: "#9AA09B" }}
        >
          찐집사 부설 냥이학교
        </p>
        <p className="display mt-1 text-[22px]" style={{ color: "#1A1A1A" }}>
          {new Date().getFullYear()} {cat.name}의 생활기록부
        </p>
      </div>

      {/* 사진 + 유형 */}
      <div className="flex items-center gap-3.5">
        {cat.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cat.photo}
            alt=""
            className="size-[64px] flex-none rounded-[18px] object-cover"
            style={{ background: "#EFF1ED" }}
          />
        ) : (
          <span
            className="flex size-[64px] flex-none items-center justify-center rounded-[18px]"
            style={{ background: "#EFF1ED", color: "#9AA09B" }}
          >
            <IconCat size={32} />
          </span>
        )}
        {summary.type && (
          <p
            className="display min-w-0 flex-1 overflow-hidden text-[19px] leading-[1.25]"
            style={{
              color: "#1A1A1A",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {summary.type}
          </p>
        )}
      </div>

      {/* 별점 — 답한 축만 */}
      {axes.length > 0 && (
        <ul className="space-y-1">
          {axes.map((a) => {
            const n = stars(a.avg as number);
            return (
              <li key={a.axis} className="flex items-center gap-2.5">
                <span
                  className="w-12 flex-none text-[13px] font-bold"
                  style={{ color: "#3F4642" }}
                >
                  {a.axis}
                </span>
                <span
                  className="text-[15px] tracking-[2px]"
                  style={{ color: "#0E5B41" }}
                  aria-label={`${n}점 만점에 5`}
                >
                  {"★".repeat(n)}
                  <span style={{ color: "#D9DEDA" }}>{"★".repeat(5 - n)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* 담임 의견 — 두 줄까지만 */}
      <div
        className="rounded-2xl p-3.5"
        style={{ background: "#EDF6F2", border: "1px solid #C8E3D8" }}
      >
        <p className="text-[11px] font-extrabold" style={{ color: "#0E5B41" }}>
          담임 의견 · 냥박사
        </p>
        <p
          className="mt-1 overflow-hidden text-[12.5px] leading-[1.55]"
          style={{
            color: "#26332D",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {summary.comment}
        </p>
      </div>

      <p className="text-center text-[10px]" style={{ color: "#B4BAB5" }}>
        찐집사에서 발급 · 성격 기록이며 건강 정보는 포함하지 않습니다
      </p>
    </div>
  );
});

export default SquareReportCard;
