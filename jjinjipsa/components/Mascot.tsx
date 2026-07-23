/* 냥박사 3D 마스코트 — 표정별 에셋 (핸드오프 assets/) */

const SRC = {
  calm: "/mascot/m1.png", // 기본
  thinking: "/mascot/m2.png", // 생각 — 냥박사 카드/로딩
  happy: "/mascot/m3.png", // 기쁨
  complete: "/mascot/m4.png", // 완료 — 오늘 기록 다 함
  concerned: "/mascot/m5.png", // 걱정 — 이상 기록
  urgent: "/mascot/m6.png", // 긴급
  empty: "/mascot/m7.png", // 빈 상태
} as const;

export type MascotMood = keyof typeof SRC;

export default function Mascot({
  mood = "calm",
  size = 56,
  className = "",
}: {
  mood?: MascotMood;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[mood]}
      alt="냥박사"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
