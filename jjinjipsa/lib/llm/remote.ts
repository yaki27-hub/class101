/*
 * 서버 라우트(/api/chat) 경유 Gemini 어댑터.
 * 컨텍스트(습관·증상)는 localStorage 소유라 클라이언트에서 모아 보낸다.
 * 라우트 실패(키 없음·네트워크)면 mock으로 폴백해 UI는 항상 동작한다.
 */

import { loadDaily } from "@/lib/dailyStatus";
import { storage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { MockLlmAdapter } from "./mock";
import type { LlmAdapter, LlmChunkedResponse, LlmRequest } from "./types";
import type { KbRefBrief } from "@/lib/kb/retrieve";

const LIMIT_TAIL =
  "\n\n⚠️ 응급이 의심되면 저를 기다리지 마세요 — 지금 다니시는 병원이나 24시간 " +
  "동물병원에 바로 연락하는 것이 맞아요.";

const LIMIT_MESSAGE_MEMBER =
  "오늘은 여기까지예요 🐾 하루에 물어볼 수 있는 횟수를 다 썼어요.\n" +
  "내일 다시 만나요! 그동안 케어 카드나 오늘의 체크를 살펴보는 것도 좋아요." +
  LIMIT_TAIL;

// 게스트에게는 다음 단계(로그인)를 알려준다 — 한도만 알리면 막다른 길이 된다
const LIMIT_MESSAGE_GUEST =
  "오늘은 여기까지예요 🐾 로그인 전에는 하루 3개까지 물어볼 수 있어요.\n" +
  "카카오로 로그인하면 하루 10개로 늘어나고, 기록도 계정에 보관돼요." +
  LIMIT_TAIL;

async function limitMessage(): Promise<string> {
  const { getTier } = await import("@/lib/limits");
  return (await getTier()) === "member" ? LIMIT_MESSAGE_MEMBER : LIMIT_MESSAGE_GUEST;
}

async function* once(text: string): AsyncIterable<string> {
  yield text;
}

async function* streamBody(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}

/** 서버가 base64로 실어 보낸 KB 참고 자료를 복원. 실패하면 표시하지 않는다. */
function decodeRefs(header: string | null): KbRefBrief[] | undefined {
  if (!header) return undefined;
  try {
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(header), (c) => c.charCodeAt(0)),
    );
    const parsed = JSON.parse(json) as KbRefBrief[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export class RemoteLlmAdapter implements LlmAdapter {
  private fallback = new MockLlmAdapter();

  async ask(req: LlmRequest): Promise<LlmChunkedResponse> {
    try {
      const [traits, symptoms, weights, allCats] = await Promise.all([
        storage.listTraits(req.cat.id),
        storage.listSymptoms(req.cat.id),
        storage.listWeights(req.cat.id).catch(() => []),
        storage.listCats().catch(() => []),
      ]);
      // R8 개체 혼동 방지 — 다른 아이들의 이름·별명을 프롬프트에 알린다
      const otherCatNames = allCats
        .filter((c) => c.id !== req.cat.id)
        .flatMap((c) => [c.name, ...(c.aliases ?? [])]);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cat: req.cat,
          traits,
          symptoms,
          // 오늘 상태 기록 — 히스토리 섹션이 "기록 없음"이라고 뭉뚱그리지 않게 (QA #4)
          todayStatus: loadDaily(req.cat.id),
          weights: weights.slice(-12),
          otherCatNames,
          history: req.history,
          question: req.question,
          image: req.image ?? null,
        }),
      });
      // 서버가 센 오늘 사용량 — 카운터 표시의 단일 출처 (429 응답에도 실려 온다)
      const usedH = Number(res.headers.get("x-chat-used"));
      const limitH = Number(res.headers.get("x-chat-limit"));
      const usage =
        Number.isFinite(usedH) && usedH > 0 && Number.isFinite(limitH) && limitH > 0
          ? { used: usedH, limit: limitH }
          : undefined;
      // 하루 한도 초과 → mock 폴백 대신 안내 메시지
      if (res.status === 429) {
        return { stream: once(await limitMessage()), model: "limit", usage };
      }
      if (!res.ok || !res.body) throw new Error(`api/chat ${res.status}`);
      return {
        stream: streamBody(res.body),
        model: res.headers.get("x-model") ?? "gemini",
        kbRefs: decodeRefs(res.headers.get("x-kb-refs")),
        usage,
      };
    } catch (e) {
      console.warn("[llm] remote 실패 → mock 폴백:", e);
      return this.fallback.ask(req);
    }
  }
}
