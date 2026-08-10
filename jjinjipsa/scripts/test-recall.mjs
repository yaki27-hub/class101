/*
 * 냥박사 기록 회상·다묘 격리 테스트 (개선 지시서 P0-7·P0-8)
 *
 * 두 층으로 검사한다:
 *  1) 정적 — buildSystemPrompt가 만든 프롬프트에 로마의 기록(증상·체중 추세·오늘
 *     상태·꼭 기억할 것)이 실제로 들어가고, 달이의 기록은 들어가지 않는지.
 *     (API 불필요 — CI에서 항상 돈다)
 *  2) 실호출 — GEMINI_API_KEY가 있으면 TEST 01~05를 진짜 모델에 물어 회상을 확인.
 *     LLM 응답은 표현이 흔들리므로 핵심 사실(날짜·수치·"찾지 못함")만 검사한다.
 *
 * 실행: npm run test:recall
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/* ── 픽스처: 로마(기록 있음)와 달이(다른 아이) ── */
const FIXTURE = {
  roma: {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    name: "로마", aliases: ["로매"], birthDate: "2021-03-01", birthEstimated: false,
    gender: "male", neutered: true, breedGroup: "코리안 숏헤어", weightKg: 6.3,
    conditions: [], indoor: true, avatar: null, photo: null, illust: null,
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  },
  symptoms: [
    { id: "s1", catId: "aaaaaaaa-0000-4000-8000-000000000001", tags: ["구토"],
      summary: "아침 사료 먹고 한 번 토함", source: "manual", chatSessionId: null,
      occurredAt: "2026-08-08T09:00:00+09:00", createdAt: "2026-08-08T09:00:00+09:00" },
  ],
  weights: [
    { id: "w1", catId: "aaaaaaaa-0000-4000-8000-000000000001", weightKg: 6.1,
      measuredAt: "2026-07-20", createdAt: "2026-07-20T00:00:00Z" },
    { id: "w2", catId: "aaaaaaaa-0000-4000-8000-000000000001", weightKg: 6.3,
      measuredAt: "2026-08-05", createdAt: "2026-08-05T00:00:00Z" },
  ],
  todayStatus: {
    meal: { level: "normal", label: "잘 먹었어요" },
    water: { level: "warning", label: "평소보다 적게 마셨어요" },
  },
  dailyHistory: [
    { 날짜: "2026-08-09", 식사: "잘 먹었어요", 음수: "평소와 같아요" },
    { 날짜: "2026-08-08", 식사: "평소보다 적어요" },
  ],
  importantNote: "심장약 아테놀올 하루 1회 복용 중. 닭고기 알레르기 있음.",
  otherCatNames: ["달이"],
  // 달이의 기록 — 로마 프롬프트에 절대 들어가면 안 되는 문자열
  dariSymptom: "달이가 계단에서 떨어져 다리를 절뚝임",
};

/* ── 1) 정적 검사 ── */
const staticSrc = `
import { buildSystemPrompt } from "./lib/llm/systemPrompt.ts";
const F = ${JSON.stringify(FIXTURE)};
const prompt = buildSystemPrompt({
  cat: F.roma,
  traits: [],
  symptoms: F.symptoms,
  todayStatus: F.todayStatus,
  dailyHistory: F.dailyHistory,
  importantNote: F.importantNote,
  weights: F.weights,
  otherCatNames: F.otherCatNames,
  kbReferences: "none",
  mentionedProducts: "none",
});
const checks = [
  ["증상 기록(구토) 포함", prompt.includes("아침 사료 먹고 한 번 토함")],
  ["최신 체중 6.3 포함", prompt.includes("6.3")],
  ["직전 체중 6.1 포함(추세)", prompt.includes("6.1")],
  ["오늘 상태(음수 적음) 포함", prompt.includes("평소보다 적게 마셨어요")],
  ["지난 7일 이력 포함", prompt.includes("2026-08-08")],
  ["꼭 기억할 것(심장약) 포함", prompt.includes("아테놀올")],
  ["닭고기 알레르기 포함", prompt.includes("닭고기 알레르기")],
  ["다묘 격리: 달이의 기록 미포함", !prompt.includes("절뚝임")],
  ["기록 없음 단정 금지 규칙 포함", prompt.includes("기록의 부재는 사건의 부재가 아니다")],
  ["답변 우선순위(R6-1) 포함", prompt.includes("R6-1")],
];
let fail = 0;
for (const [name, ok] of checks) {
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name);
}
console.log("STATIC_RESULT " + fail);
process.stdout.write("PROMPT_B64 " + Buffer.from(prompt, "utf8").toString("base64"));
`;

console.log("── 1) 정적 검사: 프롬프트에 기록이 실제로 들어가는가 ──");
let staticOut;
try {
  staticOut = execFileSync("npx", ["tsx", "-e", staticSrc], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
} catch (e) {
  process.stdout.write(e.stdout ?? "");
  process.stderr.write(e.stderr ?? "");
  process.exit(1);
}
const staticLines = staticOut.split("\n");
for (const l of staticLines) if (!l.startsWith("PROMPT_B64")) console.log(l.replace(/^STATIC_RESULT.*$/, ""));
const staticFail = Number(staticOut.match(/STATIC_RESULT (\d+)/)?.[1] ?? "1");
const prompt = Buffer.from(staticOut.match(/PROMPT_B64 (\S+)/)?.[1] ?? "", "base64").toString("utf8");

/* ── 2) 실호출 검사 (키 있을 때만) ── */
let key = process.env.GEMINI_API_KEY;
if (!key) {
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    key = env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch { /* 키 없음 */ }
}

let liveFail = 0;
if (!key) {
  console.log("\n── 2) 실호출: GEMINI_API_KEY 없음 — 건너뜀 (정적 검사만) ──");
} else {
  console.log("\n── 2) 실호출: TEST 01~05 (gemini-3.1-flash-lite) ──");
  const MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-3.1-flash-lite";

  async function ask(question) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: prompt }] },
          contents: [{ role: "user", parts: [{ text: question }] }],
          generationConfig: { temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json();
    return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  }

  /** [번호, 질문, 통과 조건(응답 텍스트), 설명] */
  const TESTS = [
    ["T01", "최근에 토한 적 있어?",
      (t) => t.includes("구토") || t.includes("토"),
      "구토 기록(8/8) 회상"],
    ["T02", "최근 체중 어때?",
      (t) => t.includes("6.3"),
      "최신 체중 6.3kg 인용"],
    ["T03", "오늘 상태 어때?",
      (t) => t.includes("물") || t.includes("음수"),
      "오늘 기록(음수 적음) 참조"],
    ["T04", "이 아이가 먹는 약 있었지?",
      (t) => t.includes("아테놀올") || t.includes("심장"),
      "꼭 기억할 것(심장약) 참조"],
    ["T05", "최근 설사했어?",
      (t) => !/설사(를|는)?\s*(했|한 적이 있)/.test(t) && (t.includes("기록") || t.includes("찾지 못")),
      "기록 없음 → 단정하지 않고 '기록에서 찾지 못함'"],
  ];

  for (const [id, q, check, desc] of TESTS) {
    try {
      const answer = await ask(q);
      const ok = check(answer);
      // 격리: 어떤 답에도 달이의 이야기가 등장하면 안 된다
      const isolated = !answer.includes("절뚝");
      if (!ok || !isolated) liveFail++;
      console.log(`  ${ok && isolated ? "OK  " : "FAIL"} ${id} ${desc}${isolated ? "" : " (격리 위반!)"}`);
      console.log(`        Q: ${q}`);
      console.log(`        A: ${answer.replace(/\n/g, " ").slice(0, 160)}…`);
    } catch (e) {
      liveFail++;
      console.log(`  FAIL ${id} 호출 실패: ${String(e).slice(0, 120)}`);
    }
  }
}

const fail = staticFail + liveFail;
console.log(`\n총 실패 ${fail}건 (정적 ${staticFail} · 실호출 ${liveFail})`);
if (fail > 0) process.exit(1);
