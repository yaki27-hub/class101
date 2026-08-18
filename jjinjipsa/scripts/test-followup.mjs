/*
 * "어제 이야기했던 것" 후속 질문 테스트 — lib/followup.ts
 *
 * 지키려는 것:
 *  - **어제** 발생(occurredAt)한 기록에만 묻는다 — 오늘 것, 그제 것은 묻지 않는다
 *    (사흘 전 기록에 "오늘은 어떤가요"를 물으면 '오늘'이 이미 흐려져 있다)
 *  - 어제 여러 건이면 가장 최근 것 하나만
 *  - 이미 답한 기록에는 다시 묻지 않는다
 *  - 질문의 조사(은/는)가 이름 받침에 맞는다
 *  - 답 저장/로드가 왕복한다 (localStorage)
 *
 * 실행: npm run test:followup
 */

import { execFileSync } from "node:child_process";

/**
 * logs: [일 전, 시각, id, tags] — occurredAt을 NOW 기준으로 만든다.
 * answered: buildFollowup에 넘길 이미 답한 logId (없으면 null).
 */
const CASES = [
  {
    name: "어제 기록 1건 → 질문 생성 (태그·어제 포함)",
    catName: "모카",
    logs: [[1, "09:30", "log-a", ["구토"]]],
    answered: null,
    expect: { logId: "log-a", questionHas: ["어제", "구토", "모카는"] },
  },
  {
    name: "오늘 기록만 → 묻지 않는다 (null)",
    catName: "모카",
    logs: [[0, "08:00", "log-a", ["구토"]]],
    answered: null,
    expect: { null: true },
  },
  {
    name: "그제 기록만 → 묻지 않는다 (null) — 그 사이 흐름은 주간 리포트 몫",
    catName: "모카",
    logs: [[2, "09:00", "log-a", ["설사"]]],
    answered: null,
    expect: { null: true },
  },
  {
    name: "어제 여러 건 → 가장 최근 것 하나만",
    catName: "모카",
    logs: [
      [1, "08:00", "log-am", ["구토"]],
      [1, "21:00", "log-pm", ["기력 없음", "식욕 없음"]],
    ],
    answered: null,
    expect: { logId: "log-pm", questionHas: ["기력 없음·식욕 없음"] },
  },
  {
    name: "이미 답한 기록 → 다시 묻지 않는다 (null)",
    catName: "모카",
    logs: [[1, "09:30", "log-a", ["구토"]]],
    answered: "log-a",
    expect: { null: true },
  },
  {
    name: "답한 것은 옛 기록이고 어제 것은 새 기록 → 새 기록에는 묻는다",
    catName: "모카",
    logs: [[1, "09:30", "log-new", ["구토"]]],
    answered: "log-old",
    expect: { logId: "log-new" },
  },
  {
    name: "받침 있는 이름 → '은' (달 → 달은)",
    catName: "달",
    logs: [[1, "09:30", "log-a", ["구토"]]],
    answered: null,
    expect: { questionHas: ["오늘 달은 어떤가요"] },
  },
  {
    name: "받침 없는 이름 → '는' (나비 → 나비는)",
    catName: "나비",
    logs: [[1, "09:30", "log-a", ["구토"]]],
    answered: null,
    expect: { questionHas: ["오늘 나비는 어떤가요"] },
  },
  {
    name: "어제 자정 직후(00:10)도 어제다 — 날짜는 로컬 기준",
    catName: "모카",
    logs: [[1, "00:10", "log-a", ["재채기"]]],
    answered: null,
    expect: { logId: "log-a" },
  },
];

const src = `
import { buildFollowup, saveFollowupAnswer, loadFollowupAnswer } from "./lib/followup.ts";

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
function occurredAt(ago, hm) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - ago);
  const [h, m] = hm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

let fail = 0;
for (const c of CASES) {
  const logs = c.logs.map(([ago, hm, id, tags]) => ({
    id, tags, occurredAt: occurredAt(ago, hm), createdAt: occurredAt(ago, hm),
  }));
  const r = buildFollowup(c.catName, logs, c.answered, NOW);
  const e = c.expect;
  const checks = [];
  if (e.null) checks.push(["null이어야 함", r === null, r, null]);
  if (e.logId) checks.push(["logId", r?.logId === e.logId, r?.logId, e.logId]);
  for (const has of e.questionHas ?? [])
    checks.push(["question포함:" + has, !!r?.question?.includes(has), r?.question, "포함"]);

  const bad = checks.filter(([, ok]) => !ok);
  if (bad.length) fail++;
  console.log((bad.length ? "  FAIL " : "  OK   ") + c.name);
  for (const [label, , actual, expected] of bad)
    console.log("        " + label + ": " + JSON.stringify(actual) + " (기대: " + JSON.stringify(expected) + ")");
}

// 답 저장/로드 왕복 — 저장한 logId·answer가 그대로 돌아와야 다시 묻지 않을 수 있다
{
  saveFollowupAnswer("cat1", "log-x", "normal");
  const back = loadFollowupAnswer("cat1");
  const ok = back?.logId === "log-x" && back?.answer === "normal" && !!back?.answeredOn;
  const other = loadFollowupAnswer("cat2"); // 다른 아이와 섞이지 않는다
  const ok2 = other === null;
  if (!ok || !ok2) fail++;
  console.log((ok && ok2 ? "  OK   " : "  FAIL ") + "답 저장/로드 왕복 + 아이별 분리");
}

console.log("\\n총 " + (CASES.length + 1) + "건 중 실패 " + fail + "건");
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
