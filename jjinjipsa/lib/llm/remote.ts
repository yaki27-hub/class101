/*
 * 서버 라우트(/api/chat) 경유 Gemini 어댑터.
 * 컨텍스트(습관·증상)는 localStorage 소유라 클라이언트에서 모아 보낸다.
 * 라우트 실패(키 없음·네트워크)면 mock으로 폴백해 UI는 항상 동작한다.
 */

import { storage } from "@/lib/storage";
import { MockLlmAdapter } from "./mock";
import type { LlmAdapter, LlmChunkedResponse, LlmRequest } from "./types";

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cat: req.cat,
          traits,
          symptoms,
          history: req.history,
          question: req.question,
        }),
      });
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
