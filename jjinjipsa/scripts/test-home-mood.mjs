/*
 * 홈 무드 판정 테스트 (T-53 · P0-1) — lib/homeMood.ts computeHome
 *
 * 무드가 "우리 애가 아픈데 맑음"으로 뜨면 신뢰가 깨진다.
 * 판정 순서(아픈 신호 > 시간대)와 기록 수 표시(점수 제거, 지시서 P0-1)를 회귀 방지한다.
 * 실행: npm run test:mood
 */

import { execFileSync } from "node:child_process";

/** [설명, record, weightNeedsVisit, 시각(시), 기대 무드, 기대 기록 수] */
const CASES = [
  ["기록 전 낮 → cloudy · 기록 0", {}, false, 14, "cloudy", 0],
  ["기록 전 밤 → night · 기록 0", {}, false, 23, "night", 0],
  ["4항목 모두 정상 낮 → sunny 4",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"],
      toilet: ["normal", "평소와 같아요"], activity: ["normal", "평소와 같아요"] },
    false, 14, "sunny", 4],
  ["3항목 정상 낮 → sunny 3 (기록 3개부터 맑음)",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"],
      toilet: ["normal", "평소와 같아요"] },
    false, 14, "sunny", 3],
  ["4항목 모두 정상 밤 → night (수고했어요)",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"],
      toilet: ["normal", "평소와 같아요"], activity: ["normal", "평소와 같아요"] },
    false, 23, "night", 4],
  ["2항목만 정상 → cloudy 2",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"] },
    false, 14, "cloudy", 2],
  ["주의 1건 → warning (밤이어도)",
    { meal: ["warning", "평소보다 적어요"], water: ["normal", "평소와 같아요"] },
    false, 23, "warning", 2],
  ["이상 1건 → sick (주의보다 우선)",
    { meal: ["danger", "거의 안 먹었어요"], water: ["warning", "평소보다 적게 마셨어요"] },
    false, 14, "sick", 2],
  ["체중 진료 권고 → 기록 정상이어도 warning",
    { meal: ["normal", "잘 먹었어요"], water: ["normal", "평소와 같아요"],
      toilet: ["normal", "평소와 같아요"], activity: ["normal", "평소와 같아요"] },
    true, 14, "warning", 4],
  ["미확인(unknown)은 기록으로 치지 않는다",
    { meal: ["unknown", "기록하지 않음"] }, false, 14, "cloudy", 0],
];

/*
 * 문구 분기 (지시서 P0 4항) — "오늘은 평소와 비슷해요"는 4항목을 다 기록하고
 * 이상값이 없을 때만 나와야 한다. 기록 안 한 항목을 정상으로 읽히게 하면 안 된다.
 * [설명, record, weightNeedsVisit, sub에 있어야 할 것, sub에 없어야 할 것]
 */
const N = ["normal", "평소와 같아요"];
const COPY_CASES = [
  ["기록 전 → 안내 문구", {}, false, "기록을 남기면", "평소와 비슷"],
  ["2/4만 기록 → '평소와 비슷' 금지",
    { meal: N, water: N }, false, "비어 있어요", "평소와 비슷해요"],
  ["3/4 기록 → 아직 '평소와 비슷' 금지",
    { meal: N, water: N, toilet: N }, false, "1개 항목", "평소와 비슷해요"],
  ["4/4 정상 → '오늘은 평소와 비슷해요'",
    { meal: N, water: N, toilet: N, activity: N }, false, "오늘은 평소와 비슷해요", "비어 있어요"],
  ["4/4지만 주의 있음 → 이상 항목을 짚는다",
    { meal: ["warning", "평소보다 적어요"], water: N, toilet: N, activity: N },
    false, "식사 기록이 평소와 달라요", "평소와 비슷해요"],
  ["4/4 정상이지만 체중 경고 → 체중을 짚는다",
    { meal: N, water: N, toilet: N, activity: N }, true, "체중을 살펴봐", "오늘은 평소와 비슷해요"],
];

const src = `
import { computeHome } from "./lib/homeMood.ts";
const cases = ${JSON.stringify(CASES)};
const copyCases = ${JSON.stringify(COPY_CASES)};
const toRecord = (rec) => Object.fromEntries(
  Object.entries(rec).map(([k, [level, label]]) => [k, { level, label }]),
);
let fail = 0;
for (const [name, rec, weightNeedsVisit, hour, expMood, expRecorded] of cases) {
  const now = new Date(2026, 7, 9, hour, 0, 0);
  const v = computeHome({ record: toRecord(rec), weightNeedsVisit, now });
  const ok = v.mood.id === expMood && v.recorded === expRecorded;
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name + " → " + v.mood.id + " / " + v.recorded +
    (ok ? "" : " (기대: " + expMood + " / " + expRecorded + ")"));
}
console.log("\\n── 문구 분기 ──");
for (const [name, rec, weightNeedsVisit, must, mustNot] of copyCases) {
  const now = new Date(2026, 7, 9, 14, 0, 0);
  const v = computeHome({ record: toRecord(rec), weightNeedsVisit, now });
  const ok = v.sub.includes(must) && !v.sub.includes(mustNot);
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name + " → \\"" + v.sub + "\\" / " + v.statusLine);
}
const total = cases.length + copyCases.length;
console.log("\\n총 " + total + "건 중 실패 " + fail + "건");
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
