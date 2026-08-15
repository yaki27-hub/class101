"use client";

/*
 * 성격 오각 레이더 — 칠판 버전 (생활기록부 리디자인 A안).
 *
 * 판에 분필로 그린 보조선이라는 신호로 **눈금·스포크는 전부 점선**이다.
 * 실선으로 바꾸면 인쇄된 차트처럼 보인다 (핸드오프 "하지 말 것").
 * 데이터 폴리곤만 실선 + 두께 2.6으로 구분된다.
 *
 * 기하는 핸드오프 스펙: R_MAX 56, R_MIN 8, LABEL_R 70, 0번 축이 12시, 시계방향.
 * 캔버스는 라벨("호기심 A+")이 잘리지 않는 최소 크기로 잡았다 — 라벨이 잘리면
 * 캔버스를 키우지 말고 LABEL_R을 줄인다.
 *
 * 색은 hex 자체 완결 — 판 전체가 이미지 캡처 대상이다.
 */

import type { RadarAxis } from "@/lib/personality";

const W = 216;
const H = 152;
const CX = 108;
const CY = 82;
const R_MAX = 56;
const R_MIN = 8;
const LABEL_R = 70;

const ACCENT = "#F5E04A";

/** i번째 축의 각도 — 0번이 12시, 시계방향 */
function angle(i: number): number {
  return (i / 5) * 2 * Math.PI - Math.PI / 2;
}

function pt(i: number, r: number): [number, number] {
  return [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))];
}

function ring(r: number): string {
  return Array.from({ length: 5 }, (_, i) =>
    pt(i, r).map((v) => v.toFixed(1)).join(","),
  ).join(" ");
}

export default function PersonalityRadar({ axes }: { axes: RadarAxis[] }) {
  const radius = (avg: number | null) =>
    avg === null ? R_MIN : R_MIN + (avg / 4) * (R_MAX - R_MIN);
  const dataPoints = axes.map((a, i) => pt(i, radius(a.avg)));

  return (
    <div className="relative" style={{ width: W, height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0" aria-hidden>
        {/* 눈금 오각형 3겹 — 분필 보조선 (점선 유지) */}
        {[1, 2, 3].map((l) => (
          <polygon
            key={l}
            points={ring(R_MIN + (l / 3) * (R_MAX - R_MIN))}
            fill="none"
            stroke="rgba(242,245,239,.34)"
            strokeWidth="1.2"
            strokeDasharray="5 6"
            strokeLinejoin="round"
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
              stroke="rgba(242,245,239,.26)"
              strokeWidth="1.2"
              strokeDasharray="3 6"
            />
          );
        })}
        {/* 데이터 폴리곤 — 유일한 실선 */}
        <polygon
          points={dataPoints.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill={ACCENT}
          fillOpacity="0.2"
          stroke={ACCENT}
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.95"
        />
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.6" fill={ACCENT} />
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
            <span className="text-[12px] font-semibold" style={{ color: "rgba(242,245,239,.8)" }}>
              {a.axis}
            </span>
            <span className="text-[12.5px] font-extrabold" style={{ color: ACCENT }}>
              {a.grade}
            </span>
          </span>
        );
      })}
      {/* 스크린리더용 — 시각 차트의 텍스트 대체 */}
      <p className="sr-only">
        {axes.map((a) => `${a.axis} ${a.grade}`).join(", ")}
      </p>
    </div>
  );
}
