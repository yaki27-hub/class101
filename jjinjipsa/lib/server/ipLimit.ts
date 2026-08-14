/*
 * IP 기준 하루 상한 (공용) — /api/chat과 /api/report-draft가 같은 카운터를 쓴다.
 *
 * 원래 chat 라우트 안에 있던 것을 옮겨왔다. 남용 방지 로직을 라우트마다 복붙하면
 * 솔트·정규화 규칙이 갈라져서, 한쪽만 고치는 순간 구멍이 생긴다.
 *
 * 이것은 **남용 방지선이지 제품 쿼터가 아니다.** 상담 한도(계정별 하루 10회)는
 * 별개이며, 생활기록부 초안이 그 한도를 먹지 않는다 (지시서 D-20 주석).
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/*
 * IP 기준 하루 상한 — 계정 한도의 구멍을 메운다.
 * 계정 한도만으로는 ①Authorization 헤더를 빼고 호출하거나 ②사이트 데이터를 지워
 * 새 익명 계정을 만들면 그대로 뚫린다. IP 상한은 토큰 유무와 무관하게 걸린다.
 *
 * 값은 넉넉하게 잡는다 — 집·회사처럼 여러 사람이 같은 IP를 쓰는 경우를 막으면 안 된다.
 * 정상 사용을 막지 않으면서 자동화된 남용만 걸리는 선이 목적이다.
 */
const IP_DAILY_LIMIT = Number(process.env.IP_DAILY_CHAT_LIMIT ?? "40");
const IP_HASH_SALT = process.env.IP_HASH_SALT ?? "jjinjipsa-ip";

/**
 * 해시 전에 주소를 네트워크 단위로 정규화한다.
 *
 * IPv6는 프라이버시 확장 때문에 뒷부분(인터페이스 ID)이 수시로 바뀐다.
 * 전체 주소를 그대로 해시하면 같은 사람이 매번 다른 키가 되어 상한이 무의미해진다.
 * 그래서 **앞 4그룹(/64 프리픽스)만** 쓴다 — 같은 회선이면 유지되는 부분이다.
 * IPv4는 그대로 쓴다(이미 안정적이고, 더 자르면 남의 트래픽까지 묶인다).
 */
export function normalizeIp(raw: string): string {
  const ip = raw.trim();

  // IPv4-mapped IPv6 (::ffff:1.2.3.4) → 뒤의 IPv4를 쓴다
  if (ip.includes(":") && ip.includes(".")) {
    const v4 = ip.slice(ip.lastIndexOf(":") + 1);
    return v4;
  }
  if (!ip.includes(":")) return ip; // IPv4

  // IPv6 — 압축(::)을 펼친 뒤 앞 4그룹(/64)만 남긴다
  const [head, tail] = ip.split("::");
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail ? tail.split(":").filter(Boolean) : [];
  const missing = 8 - headParts.length - tailParts.length;
  const full =
    ip.includes("::") && missing > 0
      ? [...headParts, ...Array(missing).fill("0"), ...tailParts]
      : ip.split(":");
  return `${full.slice(0, 4).join(":")}::/64`;
}

/** 원본 IP는 저장하지 않는다 — 솔트를 섞어 해시한 값만 넘긴다 */
export async function hashIp(req: Request): Promise<string | null> {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim();
  if (!raw) return null;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${IP_HASH_SALT}:${normalizeIp(raw)}`),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * IP 기준 사용량 +1 후 초과 여부.
 * RPC가 아직 없으면(마이그레이션 0004 미적용) 조용히 통과시킨다 — 서비스를 멈추지 않기 위해서.
 */
export async function overIpLimit(req: Request): Promise<boolean> {
  if (!Number.isFinite(IP_DAILY_LIMIT) || IP_DAILY_LIMIT <= 0) return false;
  const ipHash = await hashIp(req);
  if (!ipHash) return false;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await sb.rpc("bump_ip_usage", { p_ip_hash: ipHash });
    if (error) {
      // 0004 미적용이면 여기로 온다. 한 번씩 남겨서 적용을 잊지 않게 한다.
      console.warn("[ipLimit] bump_ip_usage 실패 (0004 마이그레이션 확인)", error.message);
      return false;
    }
    if (typeof data !== "number") return false;
    return data > IP_DAILY_LIMIT;
  } catch {
    return false;
  }
}
