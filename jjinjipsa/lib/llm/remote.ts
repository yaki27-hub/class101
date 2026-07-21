/*
 * 서버 라우트(/api/chat) 경유 Gemini 어댑터.
 * 컨텍스트(습관·증상)는 localStorage 소유라 클라이언트에서 모아 보낸다.
 * 라우트 실패(키 없음·네트워크)면 mock으로 폴백해 UI는 항상 동작한다.
 */

import { storage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { MockLlmAdapter } from "./mock";
import type { LlmAdapter, LlmChunkedResponse, LlmRequest } from "./types";

const LIMIT_MESSAGE =
  "오늘은 여기까지예요 🐾 하루에 물어볼 수 있는 횟수를 다 썼어요.\n" +
  "내일 다시 만나요! 그동안 케어 카드나 오늘의 체크를 살펴보는 것도 좋아요.";

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

export class RemoteLlmAdapter implements LlmAdapter {
  private fallback = new MockLlmAdapter();

  async ask(req: LlmRequest): Promise<LlmChunkedResponse> {
    try {
      const [traits, symptoms] = await Promise.all([
        storage.listTraits(req.cat.id),
        storage.listSymptoms(req.cat.id),
      ]);
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
          history: req.history,
          question: req.question,
          image: req.image ?? null,
        }),
      });
      // 하루 한도 초과 → mock 폴백 대신 안내 메시지
      if (res.status === 429) {
        return { stream: once(LIMIT_MESSAGE), model: "limit" };
      }
      if (!res.ok || !res.body) throw new Error(`api/chat ${res.status}`);
      return {
        stream: streamBody(res.body),
        model: res.headers.get("x-model") ?? "gemini",
      };
    } catch (e) {
      console.warn("[llm] remote 실패 → mock 폴백:", e);
      return this.fallback.ask(req);
    }
  }
}
