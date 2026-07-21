"use client";

/* F-08 챗봇 대화 화면 (T-06: mock 왕복 + 세션 저장. Gemini 연결·컨텍스트 주입은 T-07) */

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  newId,
  storage,
  type Cat,
  type ChatMessage,
  type SymptomLog,
} from "@/lib/storage";
import { extractSymptomTags } from "@/lib/symptomTags";
import { llm } from "@/lib/llm";
import { getSuggestedQuestions } from "@/lib/suggestedQuestions";
import {
  EMERGENCY_MAP_URL,
  buildRedFlagResponse,
  checkRedFlags,
} from "@/lib/redFlags";

export default function ChatPage() {
  const { id: catId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  /** 대화→기록 원탭 제안 (F-05, §5-2) */
  const [pendingLog, setPendingLog] = useState<{
    tags: string[];
    summary: string;
    sessionId: string;
  } | null>(null);
  const [logSaved, setLogSaved] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null); // 첨부 사진
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 사진 첨부: 600px JPEG 압축
  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = String(ev.target?.result ?? "");
      const img = new Image();
      img.onload = () => {
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        if (!ctx) return setPhoto(src);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        setPhoto(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => setPhoto(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

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

  // 홈/사진진단의 빠른 질문(?q=)·사진 요청(?photo=1)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setDraft(q);
    if (searchParams.get("photo") === "1")
      setTimeout(() => fileRef.current?.click(), 300);
  }, [searchParams]);

  async function send(text?: string) {
    const q = (text ?? draft).trim() || (photo ? "이 사진 좀 봐줄래요?" : "");
    if (!q || !cat || streaming !== null) return;
    const img = photo;
    setDraft("");
    setPhoto(null);
    setPendingLog(null);
    setLogSaved(false);

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
      imageUrl: img,
      model: null,
      createdAt: new Date().toISOString(),
    };
    await storage.addMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);

    // 1단계: 레드플래그 룰 엔진 — 매칭 시 AI 호출 없이 즉시 응답 (F-09)
    const flag = checkRedFlags(q);
    if (flag) {
      const alertMsg: ChatMessage = {
        id: newId(),
        sessionId: sid,
        role: "assistant",
        content: buildRedFlagResponse(flag, cat.name),
        imageUrl: null,
        model: "rule-engine",
        createdAt: new Date().toISOString(),
      };
      await storage.addMessage(alertMsg);
      setMessages((prev) => [...prev, alertMsg]);
      // 응급 대화도 기록 제안 (병원 방문 후 회고에 쓰임)
      setPendingLog({
        tags: extractSymptomTags(q).length
          ? extractSymptomTags(q)
          : [flag.label],
        summary: q,
        sessionId: sid,
      });
      return;
    }

    // 2단계: LLM 호출 + 스트리밍 렌더
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const res = await llm.ask({ cat, history, question: q, image: img });
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

    // 증상성 대화면 기록 제안 (F-05 주 입력 경로)
    const tags = extractSymptomTags(q);
    if (tags.length > 0) setPendingLog({ tags, summary: q, sessionId: sid });
  }

  async function saveSymptomLog() {
    if (!pendingLog || !cat) return;
    const log: SymptomLog = {
      id: newId(),
      catId: cat.id,
      tags: pendingLog.tags,
      summary: pendingLog.summary,
      source: "chat",
      chatSessionId: pendingLog.sessionId,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await storage.addSymptom(log);
    setPendingLog(null);
    setLogSaved(true);
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
          <>
            <div className="rounded-xl bg-brand-lavender p-5 text-ink">
              <p className="text-sm font-semibold">
                안녕하세요 집사님! 🐾
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {cat.name}에 대해 궁금한 걸 편하게 물어보세요.
                사료·행동·건강 신호, 뭐든 좋아요.
              </p>
            </div>
            {/* 추천 질문 칩 — 프로필 기반 (T-08) */}
            <div className="space-y-2 pt-1">
              <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
                이런 게 궁금하다면
              </p>
              {getSuggestedQuestions(cat).map((q) => (
                <button
                  key={q}
                  onClick={() => void send(q)}
                  className="block w-full rounded-full bg-surface-card px-4 py-2.5 text-left text-[13px] font-medium text-ink active:bg-surface-strong"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m) =>
          m.model === "rule-engine" ? (
            /* 레드플래그 고정 응답 — 룰 엔진이 AI 없이 낸 응급 안내 (F-09) */
            <div key={m.id} className="flex">
              <div className="max-w-[92%] space-y-3 rounded-lg border-2 border-error/50 bg-error/5 px-4 py-3.5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-body">
                  {m.content}
                </p>
                <a
                  href={EMERGENCY_MAP_URL}
                  target="_blank"
                  rel="noopener"
                  className="flex h-11 items-center justify-center rounded-md bg-error text-sm font-semibold text-white"
                >
                  🗺️ 가까운 24시 동물병원 찾기
                </a>
              </div>
            </div>
          ) : (
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
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt="첨부 사진"
                    className="mb-2 max-h-52 rounded-md"
                  />
                )}
                {m.content}
              </div>
            </div>
          ),
        )}
        {streaming !== null && (
          <div className="flex">
            <div className="max-w-[88%] rounded-lg rounded-bl-xs border border-hairline bg-canvas px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body">
              {streaming || "…"}
            </div>
          </div>
        )}

        {/* 대화→증상 기록 원탭 제안 (T-10) */}
        {pendingLog && streaming === null && (
          <div className="rounded-xl bg-brand-peach p-4">
            <p className="text-sm font-semibold text-ink">
              오늘 대화를 {cat.name}의 증상 기록으로 남길까요?
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pendingLog.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-medium text-ink"
                >
                  #{t}
                </span>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-ink/60">
              기록이 쌓이면 "평소랑 다른지"를 알려드릴 수 있어요.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void saveSymptomLog()}
                className="h-10 flex-1 rounded-md bg-ink text-sm font-semibold text-white"
              >
                기록 남기기
              </button>
              <button
                onClick={() => setPendingLog(null)}
                className="h-10 rounded-md border border-ink/20 px-4 text-sm font-semibold text-ink/70"
              >
                괜찮아요
              </button>
            </div>
          </div>
        )}
        {logSaved && (
          <p className="rounded-lg bg-surface-soft px-4 py-2.5 text-center text-[13px] font-medium text-body">
            🐾 기록했어요! 다음 답변부터 이 기록을 함께 볼게요.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 바 */}
      <div className="border-t border-hairline bg-canvas px-4 py-3">
        {/* 첨부 사진 미리보기 */}
        {photo && (
          <div className="mb-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="첨부" className="size-14 rounded-md object-cover" />
            <span className="text-[12px] text-muted">사진 첨부됨</span>
            <button
              onClick={() => setPhoto(null)}
              className="ml-auto rounded-full bg-surface-soft px-2.5 py-1 text-[12px] text-muted"
            >
              ✕ 제거
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhoto}
          />
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="사진 첨부"
            className="flex h-11 w-11 flex-none items-center justify-center rounded-md border border-hairline text-lg"
          >
            📷
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) void send();
            }}
            placeholder={photo ? "사진에 대해 물어보세요 (선택)" : `${cat.name}에 대해 물어보세요`}
            className="h-11 flex-1 rounded-md border border-hairline bg-canvas px-4 text-base text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
          />
          <button
            onClick={() => void send()}
            disabled={streaming !== null || (!draft.trim() && !photo)}
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
