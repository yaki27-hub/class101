/*
 * "평소와 비교해서" 문장 엔진 테스트 — lib/baseline.ts
 *
 * 지키려는 것은 **이 아이 기준의 정직한 비교**다:
 *  - 표본이 적으면(5일 미만) 비교하지 않고 "알아가는 중"이라고만 말한다
 *  - 만성적으로 적게 먹는 아이가 오늘도 적게 먹었으면 "평소와 비슷해요"다
 *    (일반 고양이 기준으로 판정하지 않는다)
 *  - 오늘은 표본에 넣지 않는다 — 오늘의 이상값이 자기 기준을 오염시키면 안 된다
 *  - "확인하지 못했어요"(unknown)는 표본에서도 오늘에서도 뺀다
 *  - 다름의 방향(좋음/나쁨)을 단정하지 않는다 — "조금 달라요"까지만
 *
 * 실행: npm run test:baseline
 */

import { execFileSync } from "node:child_process";

/**
 * daily: { <일 전>: { meal: [level, label] } } 로 지난 기록을 심는다.
 * today: buildBaselineCompare에 넘길 오늘 기록.
 */
const CASES = [
  {
    name: "오늘 기록 전 → 카드에 보여줄 항목이 없다",
    daily: { 1: { meal: ["normal", "잘 먹었어요"] } },
    today: {},
    expect: { len: 0 },
  },
  {
    name: "오늘이 '확인하지 못했어요'(unknown) → 그 항목은 비교하지 않는다",
    daily: {
      1: { water: ["normal", "평소와 같아요"] },
      2: { water: ["normal", "평소와 같아요"] },
    },
    today: { water: { level: "unknown", label: "확인하지 못했어요" } },
    expect: { len: 0 },
  },
  {
    name: "표본 4일(최소 미만) → 비교 대신 '알아가는 중' (단정 금지)",
    daily: {
      1: { meal: ["normal", "잘 먹었어요"] },
      2: { meal: ["normal", "잘 먹었어요"] },
      3: { meal: ["normal", "잘 먹었어요"] },
      4: { meal: ["normal", "잘 먹었어요"] },
    },
    today: { meal: { level: "normal", label: "잘 먹었어요" } },
    expect: {
      len: 1, status: "learning", baselineNull: true,
      noteHas: "알아가는 중", noteHas2: "4일",
    },
  },
  {
    name: "표본 5일 전부 평소 수준 + 오늘도 평소 → '평소와 비슷해요'",
    daily: {
      1: { meal: ["normal", "잘 먹었어요"] },
      2: { meal: ["normal", "잘 먹었어요"] },
      3: { meal: ["normal", "잘 먹었어요"] },
      4: { meal: ["normal", "잘 먹었어요"] },
      5: { meal: ["normal", "잘 먹었어요"] },
    },
    today: { meal: { level: "normal", label: "잘 먹었어요" } },
    expect: {
      len: 1, status: "same", anyDifferent: false,
      baselineHas: "잘 먹었어요 (5/5일)", noteHas: "비슷해요",
    },
  },
  {
    name: "만성 소식가(평소가 warning) + 오늘도 적게 → 이 아이 기준 '비슷해요'",
    daily: {
      1: { meal: ["warning", "평소보다 적어요"] },
      2: { meal: ["warning", "평소보다 적어요"] },
      3: { meal: ["normal", "잘 먹었어요"] },
      4: { meal: ["warning", "평소보다 적어요"] },
      5: { meal: ["warning", "평소보다 적어요"] },
      6: { meal: ["normal", "잘 먹었어요"] },
    },
    today: { meal: { level: "warning", label: "평소보다 적어요" } },
    expect: {
      len: 1, status: "same", anyDifferent: false,
      baselineHas: "평소보다 적어요 (4/6일)",
    },
  },
  {
    name: "평소는 잘 먹는데 오늘 거의 안 먹음 → '조금 달라요' (방향 단정 없음)",
    daily: {
      1: { meal: ["normal", "잘 먹었어요"] },
      2: { meal: ["normal", "잘 먹었어요"] },
      3: { meal: ["normal", "잘 먹었어요"] },
      4: { meal: ["normal", "잘 먹었어요"] },
      5: { meal: ["normal", "잘 먹었어요"] },
    },
    today: { meal: { level: "danger", label: "거의 안 먹었어요" } },
    expect: {
      len: 1, status: "different", anyDifferent: true,
      noteHas: "조금 달라요", noteHasNot: "나빠",
    },
  },
  {
    name: "표본의 unknown은 세지 않는다 (5 normal + 3 unknown → 표본 5일)",
    daily: {
      1: { toilet: ["normal", "평소와 같아요"] },
      2: { toilet: ["unknown", "아직 못 봤어요"] },
      3: { toilet: ["normal", "평소와 같아요"] },
      4: { toilet: ["unknown", "아직 못 봤어요"] },
      5: { toilet: ["normal", "평소와 같아요"] },
      6: { toilet: ["unknown", "아직 못 봤어요"] },
      7: { toilet: ["normal", "평소와 같아요"] },
      8: { toilet: ["normal", "평소와 같아요"] },
    },
    today: { toilet: { level: "normal", label: "평소와 같아요" } },
    expect: { len: 1, status: "same", baselineHas: "(5/5일)" },
  },
  {
    name: "오늘 저장분(0일 전)은 표본에 들어가지 않는다 — 자기 오염 방지",
    daily: {
      0: { meal: ["danger", "거의 안 먹었어요"] }, // 오늘 이미 저장돼 있어도
      1: { meal: ["normal", "잘 먹었어요"] },
      2: { meal: ["normal", "잘 먹었어요"] },
      3: { meal: ["normal", "잘 먹었어요"] },
      4: { meal: ["normal", "잘 먹었어요"] },
      5: { meal: ["normal", "잘 먹었어요"] },
    },
    today: { meal: { level: "danger", label: "거의 안 먹었어요" } },
    expect: { len: 1, status: "different", baselineHas: "(5/5일)" },
  },
  {
    name: "29일 전 기록은 '요즘 평소'가 아니다 (LOOKBACK 밖)",
    daily: {
      1: { meal: ["normal", "잘 먹었어요"] },
      2: { meal: ["normal", "잘 먹었어요"] },
      3: { meal: ["normal", "잘 먹었어요"] },
      4: { meal: ["normal", "잘 먹었어요"] },
      29: { meal: ["normal", "잘 먹었어요"] },
      35: { meal: ["normal", "잘 먹었어요"] },
    },
    today: { meal: { level: "normal", label: "잘 먹었어요" } },
    expect: { len: 1, status: "learning" }, // 4일뿐 — 표본 부족
  },
];

const src = `
import { buildBaselineCompare, MIN_BASELINE_DAYS } from "./lib/baseline.ts";

const CASES = ${JSON.stringify(CASES)};

// ── localStorage 최소 스텁 ──
const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

const NOW = new Date(2026, 7, 18, 12, 0, 0); // 2026-08-18 정오
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const dayBefore = (n) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; };

let fail = 0;
for (const c of CASES) {
  store.clear();
  for (const [ago, items] of Object.entries(c.daily)) {
    const rec = {};
    for (const [k, [level, label]] of Object.entries(items)) rec[k] = { level, label };
    localStorage.setItem("jjinjipsa:daily:cat1:" + ymd(dayBefore(Number(ago))), JSON.stringify(rec));
  }
  const r = buildBaselineCompare("cat1", c.today, NOW);
  const it = r.items[0];
  const e = c.expect;
  const checks = [];
  const cmp = (label, actual, expected) => {
    if (expected === undefined) return;
    checks.push([label, actual === expected, actual, expected]);
  };
  cmp("len", r.items.length, e.len);
  cmp("status", it?.status, e.status);
  cmp("anyDifferent", r.anyDifferent, e.anyDifferent);
  if (e.baselineNull) checks.push(["baseline null", it?.baselineLine === null, it?.baselineLine, null]);
  if (e.baselineHas) checks.push(["baseline포함:" + e.baselineHas, !!it?.baselineLine?.includes(e.baselineHas), it?.baselineLine, "포함"]);
  if (e.noteHas) checks.push(["note포함:" + e.noteHas, !!it?.note?.includes(e.noteHas), it?.note, "포함"]);
  if (e.noteHas2) checks.push(["note포함:" + e.noteHas2, !!it?.note?.includes(e.noteHas2), it?.note, "포함"]);
  if (e.noteHasNot) checks.push(["note제외:" + e.noteHasNot, !it?.note?.includes(e.noteHasNot), it?.note, "제외"]);

  const bad = checks.filter(([, ok]) => !ok);
  if (bad.length) fail++;
  console.log((bad.length ? "  FAIL " : "  OK   ") + c.name);
  for (const [label, , actual, expected] of bad)
    console.log("        " + label + ": " + JSON.stringify(actual) + " (기대: " + JSON.stringify(expected) + ")");
}
console.log("\\n총 " + CASES.length + "건 중 실패 " + fail + "건");
if (fail > 0) process.exit(1);
`;

try {
  process.stdout.write(
    execFileSync("npx", ["tsx", "-e", src], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
} catch (e) {
  process.stdout.write(e.stdout ?? "");
  process.stderr.write(e.stderr ?? "");
  process.exit(1);
}
