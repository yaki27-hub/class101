/*
 * 챗봇 API 라우트 (T-07) — GEMINI_API_KEY는 서버에서만 사용한다.
 * 클라이언트가 컨텍스트(프로필·습관·증상, localStorage 소유)를 보내오면
 * 시스템 프롬프트를 조립해 Gemini 스트리밍 응답을 plain text로 중계한다.
 * 키가 없으면 503 → 클라이언트 어댑터가 mock으로 폴백 (D-04).
 */

import { createClient } from "@supabase/supabase-js";
import { buildSystemPrompt, type PromptContext } from "@/lib/llm/systemPrompt";
import { formatKbForPrompt, retrieveKb, toRefBriefs } from "@/lib/kb/retrieve";
import { detectProducts, formatProductsForPrompt } from "@/lib/products/detect";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";

// 모델 라우팅(T-18, D-04): 텍스트/사진 모두 flash-lite.
// (gemini-3.5-flash는 사진 입력 시 타임아웃 → flash-lite가 vision도 빠르고 정확)
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-3.1-flash-lite";
const VISION_MODEL = process.env.GEMINI_VISION_MODEL ?? "gemini-3.1-flash-lite";
// 비용 통제(T-17) — 유저당 하루 챗봇 호출 한도. 0이면 무제한.
// 오픈 테스트 기본값은 10. 잠시 풀어야 하면 Vercel 환경변수 DAILY_CHAT_LIMIT을
// 0으로 두면 되고(재배포 불필요), 기본값 자체는 건드리지 않는다.
const DAILY_LIMIT = Number(process.env.DAILY_CHAT_LIMIT ?? "10");

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

/** 원본 IP는 저장하지 않는다 — 솔트를 섞어 해시한 값만 넘긴다 */
async function hashIp(req: Request): Promise<string | null> {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim();
  if (!raw) return null;
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${IP_HASH_SALT}:${raw}`),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 계정(익명 포함) 기준 사용량 +1 후 초과 여부. 토큰이 없거나 오류면 여기서는 통과시킨다. */
async function overAccountLimit(authHeader: string | null): Promise<boolean> {
  if (!Number.isFinite(DAILY_LIMIT) || DAILY_LIMIT <= 0) return false; // 무제한
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return false; // 토큰이 없어도 아래 IP 상한이 받아준다
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await sb.rpc("bump_chat_usage");
    if (error || typeof data !== "number") return false;
    return data > DAILY_LIMIT;
  } catch {
    return false;
  }
}

/**
 * IP 기준 사용량 +1 후 초과 여부.
 * RPC가 아직 없으면(마이그레이션 0004 미적용) 조용히 통과시킨다 — 서비스를 멈추지 않기 위해서.
 */
async function overIpLimit(req: Request): Promise<boolean> {
  if (!Number.isFinite(IP_DAILY_LIMIT) || IP_DAILY_LIMIT <= 0) return false;
  const ipHash = await hashIp(req);
  if (!ipHash) return false;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await sb.rpc("bump_ip_usage", { p_ip_hash: ipHash });
    if (error) {
      // 0004 미적용이면 여기로 온다. 한 번씩 남겨서 적용을 잊지 않게 한다.
      console.warn("[api/chat] bump_ip_usage 실패 (0004 마이그레이션 확인)", error.message);
      return false;
    }
    if (typeof data !== "number") return false;
    return data > IP_DAILY_LIMIT;
  } catch {
    return false;
  }
}

interface ChatBody extends PromptContext {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  question: string;
  /** 첨부 사진 dataURL (토사물·피부·검진지 등) — 있으면 상위 멀티모달 모델로 라우팅 */
  image?: string | null;
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return new Response("no-key", { status: 503 });

  // 비용 통제(T-17): 하루 한도 초과 시 AI 호출 없이 차단.
  // 계정 한도와 IP 한도를 함께 본다 — 계정 한도만으로는 토큰을 빼고 호출하면 뚫린다.
  const [accountOver, ipOver] = await Promise.all([
    overAccountLimit(req.headers.get("Authorization")),
    overIpLimit(req),
  ]);
  if (accountOver || ipOver) {
    return new Response("daily-limit", { status: 429 });
  }

  const body = (await req.json()) as ChatBody;

  // KB 검색 — 최근 증상 태그를 힌트로 함께 넣어 매칭률을 올린다
  const symptomHints = (body.symptoms ?? []).slice(-5).flatMap((s) => s.tags ?? []);
  const hits = retrieveKb(body.question, symptomHints);
  // 제품명 인식 — 추천이 아니라 처방식 안내를 위한 것 (data/products/README.md)
  const products = detectProducts(body.question);
  const system = buildSystemPrompt({
    ...body,
    kbReferences: formatKbForPrompt(hits),
    mentionedProducts: formatProductsForPrompt(products),
  });

  // 사진 첨부 여부로 모델 라우팅
  const imgMatch = body.image
    ? /^data:(image\/[a-z.+-]+);base64,(.+)$/i.exec(body.image)
    : null;
  const model = imgMatch ? VISION_MODEL : TEXT_MODEL;

  const userParts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: body.question }];
  if (imgMatch) {
    userParts.push({ inlineData: { mimeType: imgMatch[1], data: imgMatch[2] } });
  }

  const contents = [
    ...body.history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: userParts },
  ];

  console.log(
    `[api/chat] model=${model} image=${!!imgMatch} kb=${hits.map((h) => h.doc.id).join(",") || "none"} products=${products.map((p) => p.name).join(",") || "none"}`,
  );

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        // thinkingBudget 0: 첫 토큰 지연 제거 (채팅 UX 우선)
        generationConfig: {
          temperature: 0.6,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("[api/chat] gemini error", upstream.status, detail.slice(0, 300));
    return new Response("upstream-error", { status: 502 });
  }

  // SSE → 텍스트 조각만 추출해 plain text로 재스트리밍
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  interface SsePart {
    text?: string;
    thought?: boolean;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      const handleLine = (line: string) => {
        if (!line.startsWith("data: ")) return;
        const payload = line.slice(6).trim();
        if (!payload || payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload) as {
            candidates?: Array<{ content?: { parts?: SsePart[] } }>;
          };
          const text =
            json.candidates?.[0]?.content?.parts
              ?.filter((p) => p.thought !== true)
              .map((p) => p.text ?? "")
              .join("") ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          // 불완전한 JSON 조각은 무시
        }
      };
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            handleLine(buffer.slice(0, nl));
            buffer = buffer.slice(nl + 1);
          }
        }
        handleLine(buffer); // 마지막 줄에 개행이 없을 때 대비
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-model": model,
      // 실제로 프롬프트에 넣은 자료만 내려보낸다 (화면 표시는 사실과 일치해야 한다).
      // 한글이 들어가므로 base64로 감싼다 — 헤더는 latin1만 안전하다.
      "x-kb-refs": Buffer.from(JSON.stringify(toRefBriefs(hits)), "utf8").toString("base64"),
    },
  });
}
