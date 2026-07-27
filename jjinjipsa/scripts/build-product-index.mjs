/*
 * data/products/고다카페_제품리스트.md → lib/products/index.generated.json
 *
 * 목적은 **추천이 아니라 인식**이다. 집사가 제품명을 말했을 때 알아채고,
 * 처방식이면 "수의사 처방 영역"으로 안내하기 위한 사전.
 * (data/products/README.md의 R7 제약 참고 — 순위·추천에 쓰지 않는다)
 *
 * 실행: npm run products:index
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data", "products", "고다카페_제품리스트.md");
const OUT = join(ROOT, "lib", "products", "index.generated.json");

/**
 * 처방식 표지 — 진단 없이 먹이면 안 되는 제품을 걸러내기 위한 보수적 목록.
 * 애매하면 넣지 않는다(일반식을 처방식으로 잘못 표시하면 불필요한 불안을 준다).
 */
const RX_MARKERS = [
  "k/d", "c/d", "i/d", "z/d", "w/d", "t/d", "s/o",
  "레날", "유리너리", "가스트로", "인테스티널",
  "하이퍼 알러제닉", "하이퍼알러제닉", "아날러제닉",
  "메타볼릭", "세타이어티", "리커버리", "처방",
];

function isPrescription(name) {
  const n = name.toLowerCase();
  return RX_MARKERS.some((m) => n.includes(m.toLowerCase()));
}

const src = readFileSync(SRC, "utf8");
const sections = src.split(/^## /m).slice(1);

/** name → {name, categories[], rx} */
const byName = new Map();

for (const sec of sections) {
  const title = sec.split("\n")[0].split(" (")[0].trim();
  for (const line of sec.split("\n")) {
    if (!line.startsWith("- ")) continue;
    const name = line.slice(2).trim();
    if (!name) continue;
    const key = name;
    const cur = byName.get(key) ?? { name, categories: [], rx: isPrescription(name) };
    if (!cur.categories.includes(title)) cur.categories.push(title);
    byName.set(key, cur);
  }
}

const products = [...byName.values()].sort((a, b) =>
  // 긴 이름을 먼저 검사해야 "로얄캐닌 유리너리 s/o"가 "로얄캐닌"보다 먼저 잡힌다
  b.name.length - a.name.length || a.name.localeCompare(b.name),
);

const rx = products.filter((p) => p.rx);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      generatedFrom: "data/products/고다카페_제품리스트.md",
      note: "추천 목록이 아니다. 제품명 인식·처방식 안내 용도. data/products/README.md 참고",
      total: products.length,
      prescriptionCount: rx.length,
      products,
    },
    null,
    1,
  )}\n`,
  "utf8",
);

console.log(`제품 인덱스: ${products.length}개 (처방식 표시 ${rx.length}개) → ${OUT}`);
console.log(`  처방식 예: ${rx.slice(0, 5).map((p) => p.name).join(", ")}`);
