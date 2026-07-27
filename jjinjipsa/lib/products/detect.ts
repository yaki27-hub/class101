/*
 * 질문에서 제품명을 찾아낸다.
 *
 * **추천이 아니라 인식이 목적이다.** 집사가 제품명을 말했을 때 알아채서,
 * 처방식이면 "진단 없이 먹이면 안 된다"고 안내하기 위한 것.
 * 순위를 매기거나 좋다/나쁘다를 말하는 데 쓰지 않는다 (프롬프트 R7).
 */

import index from "./index.generated.json";

export interface ProductHit {
  name: string;
  categories: string[];
  /** 처방식으로 표시된 제품 */
  rx: boolean;
}

const PRODUCTS = index.products as ProductHit[];
export const PRODUCT_TOTAL: number = index.total;

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

/** 이름이 짧으면 우연히 걸리기 쉬워 최소 길이를 둔다 ("나우", "토우" 같은 2글자 브랜드) */
const MIN_LEN = 3;

/**
 * 질문에 등장한 제품을 찾는다. 긴 이름부터 검사해 가장 구체적인 것을 잡는다.
 * (인덱스가 이름 길이 내림차순으로 정렬돼 있다)
 *
 * @param limit 최대 개수 — 프롬프트가 길어지지 않게 제한
 */
export function detectProducts(text: string, limit = 3): ProductHit[] {
  const hay = norm(text);
  if (hay.length < MIN_LEN) return [];

  const hits: ProductHit[] = [];
  const covered: string[] = [];

  for (const p of PRODUCTS) {
    const n = norm(p.name);
    if (n.length < MIN_LEN) continue;
    if (!hay.includes(n)) continue;
    // 이미 잡은 더 긴 이름에 포함되는 건 건너뛴다 ("로얄캐닌 유리너리"를 잡았으면 "로얄캐닌"은 생략)
    if (covered.some((c) => c.includes(n))) continue;
    hits.push(p);
    covered.push(n);
    if (hits.length >= limit) break;
  }
  return hits;
}

/** 프롬프트에 넣을 블록 */
export function formatProductsForPrompt(hits: ProductHit[]): string {
  if (hits.length === 0) return "none";
  return hits
    .map(
      (h) =>
        `- ${h.name} (분류: ${h.categories.join("/")}${h.rx ? ", **처방식**" : ""})`,
    )
    .join("\n");
}
