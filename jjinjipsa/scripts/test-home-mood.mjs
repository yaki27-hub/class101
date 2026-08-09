/*
 * 홈 무드 판정 테스트 (T-53) — lib/homeMood.ts computeHome
 *
 * 무드가 "우리 애가 아픈데 맑음"으로 뜨면 신뢰가 깨진다.
 * 판정 순서(아픈 신호 > 시간대)와 기록 전 처리(점수 null)를 회귀 방지한다.
 * 실행: npm run test:mood
 */

import { execFileSync } from "node:child_process";

/** [설명, record, weightNeedsVisit, 시각(시), 기대 무드, 기대 점수(null 허용)] */
const CASES = [
  ["기록 전 낮 → cloudy · 점수 없음", {}, false, 14, "cloudy", null],
  ["기록 전 밤 → night · 점수 없음", {}, false, 23, "night", null],
  ["4항목 모두 정상 낮 → sunny 98",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"],
      toilet: ["normal", "평소와 같아요"], activity: ["normal", "평소와 같아요"] },
    false, 14, "sunny", 98],
  ["4항목 모두 정상 밤 → night (수고했어요)",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"],
      toilet: ["normal", "평소와 같아요"], activity: ["normal", "평소와 같아요"] },
    false, 23, "night", 98],
  ["2항목만 정상 → cloudy 78",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"] },
    false, 14, "cloudy", 78],
  ["주의 1건 → warning (밤이어도)",
    { meal: ["warning", "평소보다 적어요"], water: ["normal", "평소와 같아요"] },
    false, 23, "warning", 64],
  ["이상 1건 → sick (주의보다 우선)",
    { meal: ["danger", "거의 안 먹었어요"], water: ["warning", "평소보다 적게 마셨어요"] },
    false, 14, "sick", 34],
  ["체중 진료 권고 → 기록 정상이어도 warning",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"],
      toilet: ["normal", "평소와 같아요"], activity: ["normal", "평소와 같아요"] },
    true, 14, "warning", 98],
  ["미확인(unknown)은 기록으로 치지 않는다",
    { meal: ["unknown", "기록하지 않음"] }, false, 14, "cloudy", null],
];

const src = `
import { computeHome } from "./lib/homeMood.ts";
const cases = ${JSON.stringify(CASES)};
let fail = 0;
for (const [name, rec, weightNeedsVisit, hour, expMood, expScore] of cases) {
  const record = Object.fromEntries(
    Object.entries(rec).map(([k, [level, label]]) => [k, { level, label }]),
  );
  const now = new Date(2026, 7, 9, hour, 0, 0);
  const v = computeHome({ record, weightNeedsVisit, now });
  const ok = v.mood.id === expMood && v.score === expScore;
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name + " → " + v.mood.id + " / " + v.score +
    (ok ? "" : " (기대: " + expMood + " / " + expScore + ")"));
}
console.log("\\n총 " + cases.length + "건 중 실패 " + fail + "건");
if (fail > 0) process.exit(1);
`;

try {
  const out = execFileSync("npx", ["tsx", "-e", src], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(out);
} catch (e) {
  process.stdout.write(e.stdout ?? "");
  process.stderr.write(e.stderr ?? "");
  process.exit(1);
}
