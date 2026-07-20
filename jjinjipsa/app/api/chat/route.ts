/*
 * 챗봇 API 라우트 (T-07) — GEMINI_API_KEY는 서버에서만 사용한다.
 * 클라이언트가 컨텍스트(프로필·습관·증상, localStorage 소유)를 보내오면
 * 시스템 프롬프트를 조립해 Gemini 스트리밍 응답을 plain text로 중계한다.
 * 키가 없으면 503 → 클라이언트 어댑터가 mock으로 폴백 (D-04).
 */

import { createClient } from "@supabase/supabase-js";
import { buildSystemPrompt, type PromptContext } from "@/lib/llm/systemPrompt";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";

// 모델 라우팅(T-18) 전 기본 모델 — D-04에서 확정한 상위 모델
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
// 비용 통제(T-17) — 유저당 하루 챗봇 호출 한도
const DAILY_LIMIT = Number(process.env.DAILY_CHAT_LIMIT ?? "10");

/** 로그인 사용자면 사용량 +1 후 한도 초과 여부 반환. 비로그인/오류 시 통과(허용). */
async function overLimit(authHeader: string | null): Promise<boolean> {
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
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

interface ChatBody extends PromptContext {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  question: string;
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return new Response("no-key", { status: 503 });

  // 비용 통제(T-17): 하루 한도 초과 시 AI 호출 없이 차단
  if (await overLimit(req.headers.get("Authorization"))) {
    return new Response("daily-limit", { status: 429 });
  }

  const body = (await req.json()) as ChatBody;
  const system = buildSystemPrompt(body);

  const contents = [
    ...body.history.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: body.question }] },
  ];

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`,
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
      "x-model": MODEL,
    },
  });
}
