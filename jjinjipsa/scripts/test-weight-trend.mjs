/*
 * 체중 추이 판정 테스트 — lib/weightTrend.ts
 *
 * 이 판정은 "병원 가보세요"를 띄우는 근거라, 임계값을 손댈 때마다
 * 잡히던 감소가 안 잡히게 되는 회귀를 막아야 한다.
 *
 * 실행: npm run test:weight
 * ⚠️ 임계값(-5% / -10% / +10%)은 수의사 감수 전이다. 감수 결과에 따라
 *    기대값도 함께 고친다.
 */

import { execFileSync } from "node:child_process";

/** [설명, 기록 배열([날짜, kg]), 옵션, 기대 level, 기대 needsVisit] */
const CASES = [
  ["기록 없음", [], {}, "unknown", false],
  ["1건뿐", [["2026-07-01", 4.5]], {}, "unknown", false],
  ["안정 (변화 없음)", [["2026-04-01", 4.5], ["2026-07-01", 4.5]], {}, "stable", false],
  ["안정 (2% 감소)", [["2026-04-01", 5.0], ["2026-07-01", 4.9]], {}, "stable", false],
  ["6% 감소 → 살펴보기", [["2026-04-01", 5.0], ["2026-07-01", 4.7]], {}, "loss", true],
  ["12% 감소 → 진료", [["2026-04-01", 5.0], ["2026-07-01", 4.4]], {}, "loss-high", true],
  ["천천히 빠지는 경우도 잡힌다",
    [["2026-02-01", 5.0], ["2026-04-01", 4.8], ["2026-06-01", 4.6], ["2026-07-01", 4.4]],
    {}, "loss-high", true],
  ["12% 증가 → 급여량", [["2026-04-01", 4.0], ["2026-07-01", 4.5]], {}, "gain", false],
  ["아기 고양이는 증가가 정상", [["2026-04-01", 2.0], ["2026-07-01", 3.0]], { growing: true }, "stable", false],
  ["아기 고양이도 감소는 잡는다", [["2026-04-01", 3.0], ["2026-07-01", 2.6]], { growing: true }, "loss-high", true],
  ["1년 전 기록은 기준점에서 제외 (6개월 창)",
    [["2025-07-01", 6.0], ["2026-05-01", 4.5], ["2026-07-01", 4.5]], {}, "stable", false],
  ["입력 순서가 뒤죽박죽이어도 날짜로 정렬한다",
    [["2026-07-01", 4.4], ["2026-04-01", 5.0]], {}, "loss-high", true],
];

const src = `
import { analyzeWeights, hasThisMonthLog } from "./lib/weightTrend.ts";
const cases = ${JSON.stringify(CASES)};
let fail = 0;
console.log("— 추이 판정 —");
for (const [name, rows, opts, level, needsVisit] of cases) {
  const logs = rows.map(([measuredAt, weightKg], i) => ({
    id: "w" + i, catId: "c1", weightKg, measuredAt, createdAt: measuredAt + "T00:00:00Z",
  }));
  const t = analyzeWeights(logs, opts);
  const ok = t.level === level && t.needsVisit === needsVisit;
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name + " → " + t.level + (t.needsVisit ? "/진료" : "") +
    (ok ? "" : " (기대: " + level + (needsVisit ? "/진료" : "") + ")"));
  if (ok && t.message) console.log("        " + t.message);
}

console.log("\\n— 이번 달 기록 여부 —");
const now = new Date("2026-07-15T00:00:00Z");
const monthCases = [
  ["이번 달 있음", "2026-07-03", true],
  ["지난 달만 있음", "2026-06-30", false],
  ["작년 같은 달", "2025-07-03", false],
];
for (const [name, measuredAt, expect] of monthCases) {
  const got = hasThisMonthLog([{ id: "w", catId: "c1", weightKg: 4.5, measuredAt, createdAt: "" }], now);
  const ok = got === expect;
  if (!ok) fail++;
  console.log((ok ? "  OK   " : "  FAIL ") + name + " → " + got);
}

console.log("\\n총 " + (cases.length + monthCases.length) + "건 중 실패 " + fail + "건");
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
