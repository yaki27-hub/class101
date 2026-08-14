/*
 * 계정 경고 판정 테스트 — lib/auth/kakao.ts
 *
 * 1) shouldWarnBeforeKakao (게스트 기록 유실 경고)
 *    이 규칙이 흔들리면 둘 중 하나가 된다:
 *     - 너무 자주 물으면(잃을 게 없는데 경고) 로그인 앞에 겁주는 벽이 생기고,
 *     - 너무 안 물으면(잃을 게 있는데 조용히 진행) "로그인했더니 기록이 사라졌다"가 된다.
 *    후자가 훨씬 나쁘므로, 모르는 상태에서는 경고하는 쪽으로 기울인다.
 *
 * 2) classifyAccountSwitch (계정 바뀜 경고)
 *    카카오가 재로그인 때 다른 계정으로 자동 진입하는 사고를 잡는다.
 *    익명 uid는 기기마다 갈리는 값이라 비교하면 항상 "바뀜"이 되므로 뺀다.
 *
 * 실행: npm run test:authwarn
 */

import { execFileSync } from "node:child_process";

/** [설명, 입력, 기대] */
const CASES = [
  ["게스트 + 기록 있음 + 승격 불가 → 경고",
    { isAnonymous: true, catCount: 2, linkUnavailable: true }, true],
  ["게스트 + 기록 있음 + 승격 가능(첫 시도) → 경고 안 함 (대개 성공한다)",
    { isAnonymous: true, catCount: 2, linkUnavailable: false }, false],
  ["게스트인데 기록 없음 → 경고 안 함 (잃을 게 없다)",
    { isAnonymous: true, catCount: 0, linkUnavailable: true }, false],
  ["이미 로그인된 계정 → 경고 안 함",
    { isAnonymous: false, catCount: 3, linkUnavailable: true }, false],
  ["사용자가 이미 확인함(force) → 다시 묻지 않는다",
    { isAnonymous: true, catCount: 2, linkUnavailable: true, force: true }, false],
  ["조회 실패로 1마리로 가정된 경우도 경고 (모르면 지키는 쪽)",
    { isAnonymous: true, catCount: 1, linkUnavailable: true }, true],
];

/** [설명, 입력, 기대] — classifyAccountSwitch */
const SWITCH_CASES = [
  ["익명 세션은 비교하지 않는다 (uid가 기기마다 갈린다)",
    { isAnonymous: true, prevUid: "aaa", uid: "bbb" }, "guest"],
  ["이 기기 첫 정식 로그인 → 기록만 한다 (경고 없음)",
    { isAnonymous: false, prevUid: null, uid: "aaa" }, "first"],
  ["같은 계정 재로그인 → 조용히 통과",
    { isAnonymous: false, prevUid: "aaa", uid: "aaa" }, "same"],
  ["다른 계정으로 들어옴 → 경고 (달이 체크 증발 사례)",
    { isAnonymous: false, prevUid: "aaa", uid: "bbb" }, "switched"],
];

const src = `
import { shouldWarnBeforeKakao, classifyAccountSwitch } from "./lib/auth/kakao.ts";
const cases = ${JSON.stringify(CASES)};
const switchCases = ${JSON.stringify(SWITCH_CASES)};
let fail = 0;
const check = (name, got, expected) => {
  const ok = got === expected;
  if (!ok) fail++;
  console.log((ok ? "  OK  " : "  FAIL") + " " + name +
    (ok ? "" : " (기대: " + expected + ", 실제: " + got + ")"));
};
for (const [name, input, expected] of cases)
  check(name, shouldWarnBeforeKakao(input), expected);
for (const [name, input, expected] of switchCases)
  check(name, classifyAccountSwitch(input), expected);
const total = cases.length + switchCases.length;
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
