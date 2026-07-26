/*
 * 레드플래그 누락 테스트 — docs/트리아지_기준표.md §2(RED)의 항목을
 * 집사가 실제로 쓸 법한 문장으로 바꿔 전부 🔴로 잡히는지 확인한다.
 * (기준표 §11 운영 체크리스트 2번)
 *
 * 실행: npm run test:redflags
 * 규칙을 고칠 때마다 돌려서, 잡히던 응급이 안 잡히게 되는 회귀를 막는다.
 */

import { execFileSync } from "node:child_process";

/** [기준표 절, 집사 표현, 기대 룰 id(null이면 아무 룰이나 매칭되면 통과)] */
const MUST_FIRE = [
  ["2-1 호흡", "입을 벌리고 숨을 쉬어요", "breathing"],
  ["2-1 호흡", "목을 길게 빼고 숨을 쉬어요", "breathing"],
  ["2-1 호흡", "배가 크게 움직이면서 숨쉬어요", "breathing"],
  ["2-1 호흡", "숨 쉴 때 쌕쌕거리는 소리가 나요", "breathing"],
  ["2-1 호흡", "안정 시 호흡수를 세보니 분당 50회예요", "breathing"],
  ["2-1 호흡", "잇몸이 창백해요", "breathing"],
  ["2-1 호흡", "혀가 파랗게 보여요", "breathing"],
  ["2-2 비뇨", "화장실을 계속 들락거리는데 소변이 안 나와요", "urinary"],
  ["2-2 비뇨", "감자를 못 눴어요", "urinary"],
  ["2-2 비뇨", "소변 자세를 취한 채로 한참 굳어 있어요", "urinary"],
  ["2-2 비뇨", "오줌 눌 때 비명을 질러요", "urinary"],
  ["2-3 신경", "갑자기 경련을 일으켰어요", "neuro"],
  ["2-3 신경", "쓰러졌어요", "neuro"],
  ["2-3 신경", "뒷다리를 갑자기 못 쓰고 끌어요", "neuro"],
  ["2-3 신경", "머리를 계속 한쪽으로 기울이고 균형을 못 잡아요", "neuro"],
  ["2-4 중독", "백합 꽃을 씹은 것 같아요", "toxin"],
  ["2-4 중독", "타이레놀을 먹었어요", "toxin"],
  ["2-4 중독", "쥐약을 먹은 것 같아요", "toxin"],
  ["2-4 중독", "부동액을 핥았어요", "toxin"],
  ["2-4 중독", "양파 들어간 국물을 핥았어요", "toxin"],
  ["2-4 중독", "자일리톨 껌을 씹었어요", "toxin"],
  ["2-4 중독", "실을 삼켰어요", "toxin"],
  ["2-5 전신", "귀랑 발끝이 차갑고 축 늘어져 있어요", "shock"],
  ["2-5 전신", "잇몸이 회색이에요", "shock"],
  ["2-5 전신", "피가 계속 나고 안 멈춰요", "bleeding"],
  ["2-5 전신", "혈변을 봤어요", "bleeding"],
  ["2-5 전신", "다리 뼈가 부러진 것 같아요", "bleeding"],
  ["2-5 전신", "배가 눈에 띄게 부풀었어요", "abdomen"],
  ["2-5 전신", "헛구역질만 계속하고 아무것도 안 나와요", "abdomen"],
  ["2-5 전신", "베란다에서 떨어졌어요", "trauma"],
  ["2-5 전신", "하루 종일 토하고 축 늘어져 있어요", null],
  ["2-6 기타", "눈을 아예 못 뜨고 각막이 뿌옇게 변했어요", "eye"],
  ["2-6 기타", "진통이 시작됐는데 30분째 새끼가 안 나와요", "dystocia"],
  ["2-6 기타", "더운 차 안에 있었는데 헥헥거리고 축 처져요", "heatstroke"],
  ["3 절식", "24시간 넘게 아무것도 안 먹어요", "anorexia"],
];

/** 🔴가 아니어야 하는 문장 — 과잉 탐지 확인용 */
const MUST_NOT_FIRE = [
  "사료 추천해 주세요",
  "중성화는 언제 하는 게 좋아요?",
  "발톱은 얼마나 자주 깎아요?",
  "예방접종 일정이 궁금해요",
  "우리 애가 요즘 잘 놀아요",
];

const src = `
import { checkRedFlags } from "./lib/redFlags.ts";
const fire = ${JSON.stringify(MUST_FIRE)};
const noFire = ${JSON.stringify(MUST_NOT_FIRE)};
let fail = 0;
console.log("— 🔴로 잡혀야 하는 케이스 —");
for (const [sec, text, expect] of fire) {
  const r = checkRedFlags(text);
  const ok = r && (expect === null || r.id === expect);
  if (!ok) fail++;
  const got = r ? r.id : "미탐지";
  console.log((ok ? "  OK  " : "  FAIL") + " [" + sec + "] " + text + " → " + got + (expect && got !== expect ? " (기대: " + expect + ")" : ""));
}
console.log("\\n— 🔴가 아니어야 하는 케이스 —");
for (const text of noFire) {
  const r = checkRedFlags(text);
  if (r) { fail++; console.log("  FAIL " + text + " → " + r.id + " (과잉 탐지)"); }
  else console.log("  OK   " + text);
}
console.log("\\n총 " + (fire.length + noFire.length) + "건 중 실패 " + fail + "건");
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
