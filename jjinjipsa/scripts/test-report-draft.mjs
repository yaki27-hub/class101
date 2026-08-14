/*
 * 생활기록부 초안 테스트 (지시서 P2-1·P2-2)
 *
 * 1) 준비 조건 (lib/reportReadiness) — 앱을 오래 썼다는 것만으로 열리면 안 되고,
 *    기록은 많은데 근거 문장이 없으면 초안은 못 만든다는 것을 구분한다.
 * 2) 초안 검증 — **근거 없는 제안을 걸러내는지**가 이 기능의 정직성 전부다.
 *    라우트의 검증 규칙(문항 실재 / 보기 일치 / 근거가 입력에 실제로 있었나)을
 *    같은 로직으로 재현해 고정한다.
 *
 * 실행: npm run test:draft
 */

import { execFileSync } from "node:child_process";

const READINESS_CASES = [
  ["기록 0일 · 문장 0개 → 아직",
    { recordDays: 0, texts: [] }, { ready: false, canDraft: false }],
  ["기록 10일 → 준비됨 (문장 없으면 초안은 불가)",
    { recordDays: 10, texts: [] }, { ready: true, canDraft: false }],
  ["기록 3일인데 문장 8개 → 준비됨 (이야기가 많은 경우)",
    { recordDays: 3, texts: Array.from({ length: 8 }, (_, i) => `문장 ${i} 입니다`) },
    { ready: true, canDraft: true }],
  ["문장 3개면 초안 시도 가능",
    { recordDays: 10, texts: ["상자에 바로 들어가요", "새벽마다 우다다", "무릎에 올라와요"] },
    { ready: true, canDraft: true }],
  ["짧은 문장(4자 미만)은 근거로 세지 않는다",
    { recordDays: 10, texts: ["ㅇㅇ", "웅", "?"] }, { ready: true, canDraft: false }],
];

/** [설명, 입력 문장들, 모델이 낸 것, 살아남아야 할 key 배열] */
const VALIDATION_CASES = [
  ["근거가 입력에 있으면 통과",
    ["손님만 오면 침대 밑으로 숨어요"],
    [{ key: "낯가림", answer: "초인종만 울려도 침대 밑", evidence: "손님만 오면 침대 밑으로 숨어요" }],
    ["낯가림"]],
  ["근거를 지어내면 버린다 (입력에 없는 문장)",
    ["손님만 오면 침대 밑으로 숨어요"],
    [{ key: "사냥 실력", answer: "끝까지 쫓아가 잡아요", evidence: "낚싯대를 잘 쫓아요" }],
    []],
  ["보기에 없는 답을 만들면 버린다",
    ["상자에 1초 만에 들어가요"],
    [{ key: "상자 사랑", answer: "상자를 아주 좋아해요", evidence: "상자에 1초 만에 들어가요" }],
    []],
  ["없는 문항이면 버린다",
    ["상자에 1초 만에 들어가요"],
    [{ key: "발톱 관리", answer: "잘해요", evidence: "상자에 1초 만에 들어가요" }],
    []],
  ["같은 문항을 두 번 내면 하나만 남긴다",
    ["상자에 1초 만에 들어가요"],
    [
      { key: "상자 사랑", answer: "1초 만에 들어가요", evidence: "상자에 1초 만에 들어가요" },
      { key: "상자 사랑", answer: "한참 보다가 들어가요", evidence: "상자에 1초 만에 들어가요" },
    ],
    ["상자 사랑"]],
  ["공백·문장부호가 달라도 같은 문장이면 통과",
    ["집사가 소파에 앉으면 바로 무릎에 올라와요"],
    [{ key: "무릎냥 지수", answer: "바로 무릎에 올라와요", evidence: "집사가 소파에 앉으면 바로 무릎에 올라와요!" }],
    ["무릎냥 지수"]],
];

const src = `
import { checkReadiness } from "./lib/reportReadiness.ts";
import { PERSONALITY_QUESTIONS } from "./lib/personality.ts";

const readiness = ${JSON.stringify(READINESS_CASES)};
const validation = ${JSON.stringify(VALIDATION_CASES)};
let fail = 0;

console.log("── 준비 조건 ──");
for (const [name, input, expected] of readiness) {
  const r = checkReadiness(input);
  const ok = r.ready === expected.ready && r.canDraft === expected.canDraft;
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name +
    (ok ? "" : " (ready=" + r.ready + " canDraft=" + r.canDraft + ")"));
}

// 라우트의 검증 규칙과 동일 (app/api/report-draft/route.ts)
const norm = (s) => s.replace(/\\s+/g, "").replace(/[.,!?~…"'""']/g, "");
function keep(texts, items) {
  const normalized = texts.map(norm);
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const q = PERSONALITY_QUESTIONS.find((x) => x.key === item.key);
    if (!q || seen.has(q.key)) continue;
    const option = q.options.find((o) => o.label === item.answer);
    if (!option) continue;
    const e = norm(item.evidence ?? "");
    if (e.length < 4) continue;
    if (!normalized.some((t) => t.includes(e) || e.includes(t))) continue;
    seen.add(q.key);
    out.push(q.key);
  }
  return out;
}

console.log("\\n── 초안 검증 (근거 없는 제안 걸러내기) ──");
for (const [name, texts, items, expected] of validation) {
  const got = keep(texts, items);
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name +
    (ok ? "" : " (남은 것: " + JSON.stringify(got) + ", 기대: " + JSON.stringify(expected) + ")"));
}

const total = readiness.length + validation.length;
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
