/*
 * 개체 지칭 감지 테스트 (지시서 P0-1 골든셋) — lib/chat/catMention.ts
 *
 * 달씨 상담창에서 "로마 비만일까?" → 로마 감지가 이 기능의 존재 이유다.
 * 실행: npm run test:mention
 */

import { execFileSync } from "node:child_process";

/** [설명, 질문, 현재 catId, 기대 감지 결과(고양이 id 또는 null)] */
const CASES = [
  ["다른 아이 이름 직접 지칭", "로마 비만일까?", "dalssi", "roma"],
  ["별명으로 지칭 (로매→로마)", "로매가 요즘 밥을 잘 안 먹어", "dalssi", "roma"],
  ["문장 중간에 등장", "우리 로마가 어제부터 토를 해요", "dalssi", "roma"],
  ["다른 아이 별명 (도르→도로시)", "도르 사료 바꿔도 될까?", "dalssi", "dorothy"],
  ["현재 아이 이름은 감지 안 함", "달씨 밥을 안 먹어요", "dalssi", null],
  ["현재 아이 별명도 감지 안 함", "달이가 토했어요", "dalssi", null],
  ["이름 언급 없음", "사료 추천해 주세요", "dalssi", null],
  ["두 아이 비교 질문도 확인 대상", "로마가 달씨보다 물을 적게 마셔", "dalssi", "roma"],
  ["로마 창에서 달씨 지칭", "달씨는 왜 자꾸 울어?", "roma", "dalssi"],
  ["한 글자 유사어는 오탐하지 않음", "요즘 달라진 게 많아요", "roma", null],
];

const src = `
import { detectOtherCatMention } from "./lib/chat/catMention.ts";
const base = { birthDate: "2022-01-01", birthEstimated: false, gender: "female",
  neutered: true, breedGroup: "코숏", weightKg: 4, conditions: [], indoor: true,
  avatar: null, photo: null, illust: null, createdAt: "", updatedAt: "" };
const cats = [
  { ...base, id: "dalssi", name: "달씨", aliases: ["달이"] },
  { ...base, id: "roma", name: "로마", aliases: ["로매"] },
  { ...base, id: "dorothy", name: "도로시", aliases: ["도르"] },
];
const cases = ${JSON.stringify(CASES)};
let fail = 0;
for (const [name, text, current, expect] of cases) {
  const got = detectOtherCatMention(text, cats, current)?.id ?? null;
  const ok = got === expect;
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name + " → " + (got ?? "감지 없음") +
    (ok ? "" : " (기대: " + (expect ?? "감지 없음") + ")"));
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
