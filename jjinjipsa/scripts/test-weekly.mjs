/*
 * 주간 리포트 집계 테스트 (지시서 P1-1) — lib/weeklyReport.ts
 *
 * 지키려는 것은 숫자가 아니라 **정직함**이다:
 *  - 기록 안 한 날을 정상으로 세지 않는다 (분모는 7일이 아니라 기록한 날)
 *  - 기록이 적으면 경향을 말하지 않는다
 *  - 기록에 없는 결론("이후 괜찮아졌다")을 붙이지 않는다
 *
 * localStorage가 필요해 jsdom 대신 최소 스텁을 주입한다.
 * 실행: npm run test:weekly
 */

import { execFileSync } from "node:child_process";

/** 오늘로부터 -n일 키를 만들기 위해 스텁에 넣을 데이터 정의 */
const CASES = [
  {
    name: "기록 0일 → 경향 없이 안내만",
    daily: {},
    routine: {},
    symptoms: [],
    weights: [],
    expect: {
      recordedDays: 0,
      enough: false,
      commentHas: "기록이 아직 없어요",
      commentHasNot: "평소 수준",
    },
  },
  {
    name: "2일만 기록 → '비교하기 어려워요' (경향 단정 금지)",
    daily: { 0: { meal: "normal", water: "normal" }, 1: { meal: "normal" } },
    routine: {},
    symptoms: [],
    weights: [],
    expect: {
      recordedDays: 2,
      enough: false,
      commentHas: "비교하기 어려워요",
      commentHasNot: "평소 수준으로 적혀 있어요",
    },
  },
  {
    name: "5일 기록·전부 정상 → 분모는 기록일(7일 아님)",
    daily: {
      0: { meal: "normal", water: "normal" },
      1: { meal: "normal", water: "normal" },
      2: { meal: "normal", water: "normal" },
      3: { meal: "normal", water: "normal" },
      4: { meal: "normal", water: "normal" },
    },
    routine: {},
    symptoms: [],
    weights: [],
    expect: {
      recordedDays: 5,
      enough: true,
      mealRecordedDays: 5,
      mealNormalDays: 5,
      commentHas: "기록된 5일",
      commentHasNot: "7일",
    },
  },
  {
    name: "이상 기록 있으면 항목을 짚는다",
    daily: {
      0: { meal: "warning", water: "normal" },
      1: { meal: "normal", water: "normal" },
      2: { meal: "normal", water: "normal" },
      3: { meal: "danger", water: "normal" },
    },
    routine: {},
    symptoms: [],
    weights: [],
    expect: {
      recordedDays: 4,
      enough: true,
      mealOffDays: 2,
      commentHas: "식사 2일",
      commentHasNot: "모두 평소 수준",
    },
  },
  {
    name: "증상은 횟수만 — '이후 괜찮아졌다' 같은 결론 금지",
    daily: {
      0: { meal: "normal" }, 1: { meal: "normal" },
      2: { meal: "normal" }, 3: { meal: "normal" },
    },
    routine: {},
    symptoms: [{ dayAgo: 2, tags: ["구토"] }],
    weights: [],
    expect: {
      recordedDays: 4,
      enough: true,
      symptomTop: "구토",
      symptomCount: 1,
      commentHas: "구토 1회",
      commentHasNot: "괜찮",
    },
  },
  {
    name: "지난주 증상은 이번 주 집계에서 빠진다",
    daily: {
      0: { meal: "normal" }, 1: { meal: "normal" },
      2: { meal: "normal" }, 3: { meal: "normal" },
    },
    routine: {},
    symptoms: [{ dayAgo: 9, tags: ["구토"] }],
    weights: [],
    expect: { recordedDays: 4, enough: true, symptomLen: 0 },
  },
  {
    name: "양치 5일 집계 + 연속 3일",
    daily: {
      0: { meal: "normal" }, 1: { meal: "normal" },
      2: { meal: "normal" }, 3: { meal: "normal" },
    },
    // 오늘·어제·그저께 연속, 그리고 4·5일 전에도 했지만 3일 전에 끊김
    routine: { 0: [true], 1: [true], 2: [true], 4: [true], 5: [true] },
    symptoms: [],
    weights: [],
    expect: { brushDays: 5, brushStreak: 3 },
  },
  {
    name: "오늘 양치 전이어도 어제까지의 연속은 살아 있다",
    daily: {},
    routine: { 1: [true], 2: [true] },
    symptoms: [],
    weights: [],
    expect: { brushStreak: 2 },
  },
];

const src = `
// 정적 import — tsx -e는 top-level await를 못 쓴다.
// 두 모듈 모두 window/localStorage를 **호출 시점에** 보므로 import 뒤 스텁을 심어도 된다.
import { buildWeeklyReport } from "./lib/weeklyReport.ts";
import { brushStreak } from "./lib/careRoutine.ts";

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

const LEVEL_LABEL = { normal: "평소와 같아요", warning: "평소보다 적어요", danger: "거의 안 먹었어요" };
const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const dayBefore = (n) => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d; };
const NOW = new Date(2026, 7, 10, 12, 0, 0); // 2026-08-10 정오

let fail = 0;
for (const c of CASES) {
  store.clear();
  for (const [ago, items] of Object.entries(c.daily)) {
    const rec = {};
    for (const [k, level] of Object.entries(items)) rec[k] = { level, label: LEVEL_LABEL[level] };
    localStorage.setItem("jjinjipsa:daily:cat1:" + ymd(dayBefore(Number(ago))), JSON.stringify(rec));
  }
  for (const [ago, done] of Object.entries(c.routine)) {
    localStorage.setItem("jjinjipsa:routine:cat1:" + ymd(dayBefore(Number(ago))), JSON.stringify(done));
  }
  const symptoms = c.symptoms.map((s, i) => ({
    id: "s" + i, catId: "cat1", tags: s.tags, summary: "", source: "manual",
    chatSessionId: null, occurredAt: dayBefore(s.dayAgo).toISOString(),
    createdAt: dayBefore(s.dayAgo).toISOString(),
  }));
  const r = buildWeeklyReport({ catId: "cat1", catName: "로마", symptoms, weights: c.weights, now: NOW });
  const meal = r.items.find((i) => i.key === "meal");
  const e = c.expect;
  const got = {};
  const checks = [];
  const cmp = (label, actual, expected) => {
    if (expected === undefined) return;
    got[label] = actual;
    checks.push([label, actual === expected, actual, expected]);
  };
  cmp("recordedDays", r.recordedDays, e.recordedDays);
  cmp("enough", r.enough, e.enough);
  cmp("mealRecordedDays", meal.recordedDays, e.mealRecordedDays);
  cmp("mealNormalDays", meal.normalDays, e.mealNormalDays);
  cmp("mealOffDays", meal.offDays, e.mealOffDays);
  cmp("symptomLen", r.symptoms.length, e.symptomLen);
  cmp("symptomTop", r.symptoms[0]?.tag, e.symptomTop);
  cmp("symptomCount", r.symptoms[0]?.count, e.symptomCount);
  cmp("brushDays", r.care[0].days, e.brushDays);
  if (e.brushStreak !== undefined) cmp("brushStreak", brushStreak("cat1", NOW), e.brushStreak);
  if (e.commentHas) checks.push(["comment포함:" + e.commentHas, r.comment.includes(e.commentHas), r.comment.slice(0, 60), "포함"]);
  if (e.commentHasNot) checks.push(["comment제외:" + e.commentHasNot, !r.comment.includes(e.commentHasNot), r.comment.slice(0, 60), "제외"]);

  const bad = checks.filter(([, ok]) => !ok);
  if (bad.length) fail++;
  console.log((bad.length ? "  FAIL " : "  OK   ") + c.name);
  for (const [label, , actual, expected] of bad) {
    console.log("        " + label + ": " + JSON.stringify(actual) + " (기대: " + JSON.stringify(expected) + ")");
  }
}
console.log("\\n총 " + CASES.length + "건 중 실패 " + fail + "건");
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
