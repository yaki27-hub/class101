"use client";

/*
 * 성격 오각 레이더 (생활기록부 리디자인) — 12줄을 다 읽지 않아도 성격이 한눈에.
 *
 * 기하는 핸드오프 스펙 그대로: 278×214 고정 캔버스, 0번 축이 12시, 시계방향.
 * 이미지 캡처 대상(ReportCard) 안에 들어가므로 색은 hex로 자체 완결이어야 한다.
 * 라벨이 잘리면 컨테이너를 키우지 말고 LABEL_R을 줄인다 (스펙 지침).
 */

import type { RadarAxis } from "@/lib/personality";

const W = 278;
const H = 214;
const CX = 139;
const CY = 103;
const R_MAX = 68;
const R_MIN = 9;
const LABEL_R = 94;

/** i번째 축의 각도 — 0번이 12시, 시계방향 */
function angle(i: number): number {
  return (i / 5) * 2 * Math.PI - Math.PI / 2;
}

function pt(i: number, r: number): [number, number] {
  return [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))];
}

function ring(r: number): string {
  return Array.from({ length: 5 }, (_, i) => pt(i, r).map((v) => v.toFixed(1)).join(","))
    .join(" ");
}

export default function PersonalityRadar({ axes }: { axes: RadarAxis[] }) {
  const radius = (avg: number | null) =>
    avg === null ? R_MIN : R_MIN + (avg / 4) * (R_MAX - R_MIN);
  const dataPoints = axes.map((a, i) => pt(i, radius(a.avg)));

  return (
    <div>
      <div className="relative mx-auto" style={{ width: W, height: H }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="absolute inset-0"
          aria-hidden
        >
          {/* 눈금 오각형 4겹 + 스포크 */}
          {[1, 2, 3, 4].map((l) => (
            <polygon
              key={l}
              points={ring(R_MIN + (l / 4) * (R_MAX - R_MIN))}
              fill="none"
              stroke="#D9DEDA"
              strokeWidth="1"
            />
          ))}
          {axes.map((_, i) => {
            const [x, y] = pt(i, R_MAX);
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={x}
                y2={y}
                stroke="#D9DEDA"
                strokeWidth="1"
              />
            );
          })}
          {/* 데이터 폴리곤 + 꼭짓점 */}
          <polygon
            points={dataPoints.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}
            fill="#0E5B41"
            fillOpacity="0.78"
            stroke="#0E5B41"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {dataPoints.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.4" fill="#0A3D2B" />
          ))}
        </svg>

        {/* 축 라벨 — 이름 + 등급 */}
        {axes.map((a, i) => {
          const [x, y] = pt(i, LABEL_R);
          return (
            <span
              key={a.axis}
              className="absolute flex items-center gap-[5px] whitespace-nowrap"
              style={{ left: x, top: y, transform: "translate(-50%,-50%)" }}
            >
              <span className="text-[11.5px] font-semibold text-[#7A7F7B]">
                {a.axis}
              </span>
              <span className="text-[12px] font-extrabold text-[#1A1A1A]">
                {a.grade}
              </span>
            </span>
          );
        })}
      </div>
      <p className="mt-1 text-center text-[11px] text-[#9AA09B]">
        답한 항목만 반영돼요 · 넓다고 좋은 게 아니에요
      </p>
    </div>
  );
}
