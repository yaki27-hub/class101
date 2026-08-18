/*
 * "평소 모습" 프로필 테스트 — lib/usualProfile.ts
 *
 * 지키려는 것:
 *  - 표본 5일 미만이면 "알아가는 중"으로만 말한다 (평소를 지어내지 않는다)
 *  - 만성 소식가의 평소는 "적게 먹는 날이 많아요"다 — 이 아이 기준 서술
 *  - 요즘 달라진 점은 최근 7일에서 평소 수준과 다른 날 수만 센다 (방향 단정 금지)
 *  - 좋아하는 것은 집사가 직접 답한 것(매핑된 답)과 사료·간식 메모에서만 —
 *    매핑에 없는 답은 넣지 않고, 등급이 낮다고 "싫어함"으로 뒤집지 않는다
 *
 * 실행: npm run test:usual
 */

import { execFileSync } from "node:child_process";

const CASES = [
  {
    name: "표본 6일 잘 먹음 → '밥을 잘 먹는 편이에요' + 근거 일수",
    daily: Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((a) => [a, { meal: ["normal", "잘 먹었어요"] }]),
    ),
    expect: {
      knownKeys: ["meal"],
      sentenceHas: "잘 먹는 편",
      evidenceHas: "기록한 6일 중 6일",
      learningLen: 3, // 물·배변·활동은 기록 0일
      changesLen: 0,
    },
  },
  {
    name: "표본 4일 → known이 아니라 learning (평소를 지어내지 않는다)",
    daily: Object.fromEntries(
      [1, 2, 3, 4].map((a) => [a, { meal: ["normal", "잘 먹었어요"] }]),
    ),
    expect: { knownLen: 0, learningLen: 4, learningHas: "기록 4일" },
  },
  {
    name: "만성 소식가 → '적게 먹는다고 기록한 날이 많아요' (이 아이 기준)",
    daily: Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((a) => [
        a,
        { meal: a % 3 === 0 ? ["normal", "잘 먹었어요"] : ["warning", "평소보다 적어요"] },
      ]),
    ),
    expect: { knownKeys: ["meal"], sentenceHas: "적게 먹는다고 기록한 날이 많아요" },
  },
  {
    name: "최근 7일 중 2일이 평소와 다름 → 달라진 점 '이번 주 2일'",
    daily: {
      // 표본(1~14일 전): 대부분 normal
      ...Object.fromEntries(
        [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((a) => [
          a,
          { meal: ["normal", "잘 먹었어요"] },
        ]),
      ),
      // 최근 7일 안의 이틀만 다르게 (1·2일 전) — 표본에도 포함되지만 소수라 최빈은 normal
      1: { meal: ["danger", "거의 안 먹었어요"] },
      2: { meal: ["warning", "평소보다 적어요"] },
    },
    expect: {
      knownKeys: ["meal"],
      changesLen: 1,
      changeHas: "식사가 평소와 달랐던 날이 이번 주 2일", // 받침 없는 말 → '가'
      changeHasNot: "나빠",
    },
  },
  {
    name: "활동의 '평소보다 적어요'는 밥 문장이 아니라 활동 문장 (항목별 매핑)",
    daily: Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((a) => [a, { activity: ["warning", "평소보다 적어요"] }]),
    ),
    expect: { knownKeys: ["activity"], sentenceHas: "조용히 쉬는 날이 많은 편" },
  },
  {
    name: "이번 주 전부 평소 수준 → 달라진 점 없음",
    daily: Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7, 8].map((a) => [a, { water: ["normal", "평소와 같아요"] }]),
    ),
    expect: { knownKeys: ["water"], changesLen: 0 },
  },
  {
    name: "매핑에 없는 라벨은 그대로 인용한다 (지어내지 않기)",
    daily: Object.fromEntries(
      [1, 2, 3, 4, 5].map((a) => [a, { meal: ["normal", "츄르만 먹음"] }]),
    ),
    expect: { knownKeys: ["meal"], sentenceHas: "\"츄르만 먹음\"로 기록한 날이 많아요" },
  },
];

const LIKE_CASES = [
  {
    name: "매핑된 답 + 사료 메모 → 좋아하는 것",
    traits: [
      { questionKey: "성격:낮잠 자리", answer: "햇빛 드는 창가", answeredOn: "2026-08-01" },
      { questionKey: "성격:간식 반응속도", answer: "0.1초 만에 나타나요", answeredOn: "2026-08-01" },
    ],
    foodNotes: ["습식 사료를 더 잘 먹어요"],
    expect: ["햇빛 드는 창가를 좋아해요.", "간식에 진심이에요.", "습식 사료를 더 잘 먹어요"],
  },
  {
    name: "매핑에 없는 답은 넣지 않는다 (낮은 등급을 '싫어함'으로 뒤집지 않는다)",
    traits: [
      { questionKey: "성격:손 탐", answer: "3초 뒤에 물어요", answeredOn: "2026-08-01" },
      { questionKey: "성격:간식 반응속도", answer: "별로 안 좋아해요", answeredOn: "2026-08-01" },
    ],
    foodNotes: [],
    expect: [],
  },
  {
    name: "같은 문항은 최신 답만 쓴다",
    traits: [
      { questionKey: "성격:낮잠 자리", answer: "햇빛 드는 창가", answeredOn: "2026-08-01" },
      { questionKey: "성격:낮잠 자리", answer: "집사 옆이나 배 위", answeredOn: "2026-08-10" },
    ],
    foodNotes: [],
    expect: ["집사 옆에서 자는 걸 좋아해요."],
  },
];

const src = `
import { buildUsualProfile, buildLikes } from "./lib/usualProfile.ts";

const CASES = ${JSON.stringify(CASES)};
const LIKE_CASES = ${JSON.stringify(LIKE_CASES)};

const store = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

const NOW = new Date(2026, 7, 18, 12, 0, 0);
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
  const r = buildUsualProfile("cat1", NOW);
  const e = c.expect;
  const checks = [];
  const cmp = (label, actual, expected) => {
    if (expected === undefined) return;
    checks.push([label, JSON.stringify(actual) === JSON.stringify(expected), actual, expected]);
  };
  cmp("knownLen", e.knownLen !== undefined ? r.known.length : undefined, e.knownLen);
  if (e.knownKeys) cmp("knownKeys", r.known.map((k) => k.key), e.knownKeys);
  cmp("learningLen", e.learningLen !== undefined ? r.learning.length : undefined, e.learningLen);
  cmp("changesLen", e.changesLen !== undefined ? r.changes.length : undefined, e.changesLen);
  if (e.sentenceHas) checks.push(["sentence포함:" + e.sentenceHas, !!r.known[0]?.sentence.includes(e.sentenceHas), r.known[0]?.sentence, "포함"]);
  if (e.evidenceHas) checks.push(["evidence포함:" + e.evidenceHas, !!r.known[0]?.evidence.includes(e.evidenceHas), r.known[0]?.evidence, "포함"]);
  if (e.learningHas) checks.push(["learning포함:" + e.learningHas, r.learning.some((l) => l.sentence.includes(e.learningHas)), r.learning.map((l) => l.sentence), "포함"]);
  if (e.changeHas) checks.push(["change포함:" + e.changeHas, !!r.changes[0]?.sentence.includes(e.changeHas), r.changes[0]?.sentence, "포함"]);
  if (e.changeHasNot) checks.push(["change제외:" + e.changeHasNot, !r.changes[0]?.sentence.includes(e.changeHasNot), r.changes[0]?.sentence, "제외"]);

  const bad = checks.filter(([, ok]) => !ok);
  if (bad.length) fail++;
  console.log((bad.length ? "  FAIL " : "  OK   ") + c.name);
  for (const [label, , actual, expected] of bad)
    console.log("        " + label + ": " + JSON.stringify(actual) + " (기대: " + JSON.stringify(expected) + ")");
}

for (const c of LIKE_CASES) {
  const traits = c.traits.map((t, i) => ({ id: "t" + i, catId: "cat1", createdAt: t.answeredOn, ...t }));
  const got = buildLikes(traits, c.foodNotes);
  const ok = JSON.stringify(got) === JSON.stringify(c.expect);
  if (!ok) fail++;
  console.log((ok ? "  OK   " : "  FAIL ") + c.name);
  if (!ok) console.log("        " + JSON.stringify(got) + " (기대: " + JSON.stringify(c.expect) + ")");
}

console.log("\\n총 " + (CASES.length + LIKE_CASES.length) + "건 중 실패 " + fail + "건");
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
