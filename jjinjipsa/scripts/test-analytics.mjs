/*
 * 지표 이벤트 테스트 (지시서 Phase 4) — lib/analytics.ts
 *
 * 여기서 지키려는 것은 숫자 정확도가 아니라 **무엇이 서버로 안 나가는가**다.
 * 지표를 붙이는 순간 가장 쉽게 벌어지는 사고가 "디버깅하려고 질문 원문을
 * props에 잠깐 넣었다가 그대로 배포"라서, 그게 코드로 막혀 있는지 본다:
 *
 *  - 화이트리스트 밖의 이벤트 이름은 아예 행을 만들지 않는다
 *  - 화이트리스트 밖의 props 키는 버린다 (고양이 이름·메모·질문이 여기 걸린다)
 *  - 문자열 값은 짧은 ASCII 슬러그만 — 한글은 통과할 수 없다
 *
 * 네트워크가 필요 없는 순수 함수(buildEvent/sanitizeProps)만 검사한다.
 * 실행: npm run test:analytics
 */

import { execFileSync } from "node:child_process";

const CASES = [
  {
    name: "화이트리스트 밖 이벤트는 행을 만들지 않는다",
    call: ["definitely_not_an_event", { count: 1 }],
    expectNull: true,
  },
  {
    name: "props 없이도 빈 객체로 정상 생성",
    call: ["app_open"],
    expectProps: {},
  },
  {
    name: "한글 값은 통과 못 한다 (고양이 이름·메모 사고 방지)",
    call: ["symptom_saved", { from: "달이", kind: "구토가 심해요" }],
    expectProps: {},
  },
  {
    name: "화이트리스트 밖 키는 버린다 (question·catName·memoText)",
    call: [
      "chat_asked",
      { question: "abc", catName: "abc", memoText: "abc", scope: "guest" },
    ],
    expectProps: { scope: "guest" },
  },
  {
    name: "24자를 넘는 문자열은 버린다",
    call: ["symptom_saved", { from: "a".repeat(25) }],
    expectProps: {},
  },
  {
    name: "슬러그 규격(a-z0-9_-)만 통과 — 공백·대문자·기호 탈락",
    call: ["chat_asked", { scope: "Account", source: "sug gested" }],
    expectProps: {},
  },
  {
    name: "숫자는 정수로 반올림, 불리언은 그대로",
    call: ["symptom_saved", { tags: 2.6, memo: false }],
    expectProps: { tags: 3, memo: false },
  },
  {
    name: "NaN·Infinity는 버린다 (jsonb에 넣을 수 없다)",
    call: ["daily_status_saved", { items: NaN, count: Infinity, days: 4 }],
    expectProps: { days: 4 },
  },
  {
    name: "day는 넘긴 값을 그대로 쓴다 (로컬 날짜 기준 집계)",
    call: ["app_open", {}, "2026-08-14"],
    expectDay: "2026-08-14",
  },
  {
    name: "실제 호출 지점 그대로 — 증상 저장",
    call: ["symptom_saved", { tags: 1, memo: true, from: "quick" }],
    expectProps: { tags: 1, memo: true, from: "quick" },
  },
];

/** 코드가 부르는 이벤트 이름이 EVENT_NAMES에 다 있는지 (오타 방지) */
const USED_IN_APP = [
  "app_open",
  "daily_status_saved",
  "symptom_saved",
  "symptom_to_chat",
  "chat_asked",
  "weekly_report_viewed",
  "report_draft_requested",
  "report_draft_applied",
  "share_card_saved",
  "brush_milestone_shown",
];

const src = `
import { buildEvent, EVENT_NAMES } from "./lib/analytics.ts";

const CASES = ${JSON.stringify(CASES)};
const USED_IN_APP = ${JSON.stringify(USED_IN_APP)};

// NaN/Infinity는 JSON을 못 타므로 해당 케이스만 여기서 되살린다
for (const c of CASES) {
  if (c.name.startsWith("NaN")) c.call[1] = { items: NaN, count: Infinity, days: 4 };
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let fail = 0;

for (const c of CASES) {
  const row = buildEvent(...c.call);
  const bad = [];
  if (c.expectNull) {
    if (row !== null) bad.push(["행 생성", row, "null"]);
  } else {
    if (row === null) bad.push(["행 생성", "null", "행"]);
    else {
      if (c.expectProps && !eq(row.props, c.expectProps))
        bad.push(["props", row.props, c.expectProps]);
      if (c.expectDay && row.day !== c.expectDay) bad.push(["day", row.day, c.expectDay]);
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(row.day)) bad.push(["day 형식", row.day, "yyyy-MM-dd"]);
    }
  }
  if (bad.length) fail++;
  console.log((bad.length ? "  FAIL " : "  OK   ") + c.name);
  for (const [label, actual, expected] of bad)
    console.log("        " + label + ": " + JSON.stringify(actual) + " (기대: " + JSON.stringify(expected) + ")");
}

// 화면이 부르는 이름이 전부 화이트리스트에 있는가
const missing = USED_IN_APP.filter((n) => !EVENT_NAMES.includes(n));
if (missing.length) fail++;
console.log((missing.length ? "  FAIL " : "  OK   ") + "화면이 부르는 이벤트가 전부 화이트리스트에 있다");
if (missing.length) console.log("        빠진 이름: " + missing.join(", "));

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
