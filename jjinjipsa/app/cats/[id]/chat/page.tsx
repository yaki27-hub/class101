"use client";

/* F-08 챗봇 대화 화면 (T-06: mock 왕복 + 세션 저장. Gemini 연결·컨텍스트 주입은 T-07) */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  newId,
  storage,
  type Cat,
  type ChatMessage,
} from "@/lib/storage";
import { llm } from "@/lib/llm";

export default function ChatPage() {
  const { id: catId } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 고양이 + 최근 세션 이어보기
  useEffect(() => {
    void (async () => {
      const c = await storage.getCat(catId);
      setCat(c);
      if (!c) return;
      const sessions = await storage.listSessions(catId);
      const last = sessions[sessions.length - 1];
      if (last) {
        setSessionId(last.id);
        setMessages(await storage.listMessages(last.id));
      }
    })();
  }, [catId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    const q = draft.trim();
    if (!q || !cat || streaming !== null) return;
    setDraft("");

    // 세션 없으면 생성
    let sid = sessionId;
    if (!sid) {
      sid = newId();
      await storage.createSession({
        id: sid,
        catId,
        title: q.slice(0, 24),
        startedAt: new Date().toISOString(),
      });
      setSessionId(sid);
    }

    const userMsg: ChatMessage = {
      id: newId(),
      sessionId: sid,
      role: "user",
      content: q,
      imageUrl: null,
      model: null,
      createdAt: new Date().toISOString(),
    };
    await storage.addMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);

    // LLM 호출 (지금은 mock) + 스트리밍 렌더
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const res = await llm.ask({ cat, history, question: q });
    setStreaming("");
    let full = "";
    for await (const chunk of res.stream) {
      full += chunk;
      setStreaming(full);
    }
    const botMsg: ChatMessage = {
      id: newId(),
      sessionId: sid,
      role: "assistant",
      content: full,
      imageUrl: null,
      model: res.model,
      createdAt: new Date().toISOString(),
    };
    await storage.addMessage(botMsg);
    setMessages((prev) => [...prev, botMsg]);
    setStreaming(null);
  }

  if (cat === undefined) return null;
  if (cat === null)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-body">등록된 아이를 찾을 수 없어요.</p>
        <Link href="/" className="text-sm font-semibold text-ink underline">
          홈으로
        </Link>
      </main>
    );

  return (
    <main className="flex h-dvh flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-hairline bg-canvas px-5 py-4">
        <Link href={`/cats/${catId}`} className="text-sm font-medium text-muted">
          ←
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold text-ink">🐈 {cat.name}</p>
          <p className="text-[11px] text-muted">
            {cat.name}를 아는 건강 도우미
          </p>
        </div>
        <span className="w-4" />
      </header>

      {/* 메시지 리스트 */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {messages.length === 0 && streaming === null && (
          <div className="rounded-xl bg-brand-lavender p-5 text-ink">
            <p className="text-sm font-semibold">
              안녕하세요 집사님! 🐾
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {cat.name}에 대해 궁금한 걸 편하게 물어보세요.
              사료·행동·건강 신호, 뭐든 좋아요.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-lg rounded-br-xs bg-ink px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white"
                  : "max-w-[88%] rounded-lg rounded-bl-xs border border-hairline bg-canvas px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {streaming !== null && (
          <div className="flex">
            <div className="max-w-[88%] rounded-lg rounded-bl-xs border border-hairline bg-canvas px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body">
              {streaming || "…"}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 바 */}
      <div className="border-t border-hairline bg-canvas px-4 py-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) void send();
            }}
            placeholder={`${cat.name}에 대해 물어보세요`}
            className="h-11 flex-1 rounded-md border border-hairline bg-canvas px-4 text-base text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
          />
          <button
            onClick={() => void send()}
            disabled={streaming !== null || !draft.trim()}
            className="h-11 rounded-md bg-ink px-5 text-sm font-semibold text-white disabled:bg-ink/20"
          >
            전송
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-soft">
          참고 정보이며, 진단·처방은 수의사의 영역이에요.
        </p>
      </div>
    </main>
  );
}
