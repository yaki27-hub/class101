"use client";

/*
 * F-08 냥박사 상담 — 리디자인 시안 2a 적용.
 *
 * 로직(레드플래그 룰 엔진 → LLM 스트리밍 → 대화·기록 저장, 개체 확인 게이트)은
 * 그대로다. 바뀐 건 껍데기와 위계뿐이다: 흰 헤더 / 라이트 그레이 본문 /
 * 말풍선 라운드 20-20-20-6, 그리고 "새 대화"·사용량 표시가 새로 붙었다.
 *
 * 2뎁스라서 무드 그라디언트는 쓰지 않는다 (가이드 §하지 말 것).
 */

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
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
import Mascot from "@/components/Mascot";
import { detectOtherCatMention } from "@/lib/chat/catMention";
import { IconCamera, IconClose } from "@/components/icons";
import BackButton from "@/components/BackButton";
import AnswerBlocks from "@/components/chat/AnswerBlocks";
import { bumpChatUsage, loadChatUsage, syncChatUsage } from "@/lib/chatUsage";
import { FREE_DAILY_QUESTIONS, GUEST_DAILY_QUESTIONS, getTier } from "@/lib/limits";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

/** AI 답변의 마크다운 ** 강조 기호 정리 */
function clean(text: string) {
  return text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "");
}

/** 냥박사 아바타 — 말풍선 옆 32px 원 */
function BotAvatar({ urgent = false }: { urgent?: boolean }) {
  return (
    <span
      className={`flex size-8 flex-none items-center justify-center overflow-hidden rounded-full ${
        urgent ? "bg-[#FFEDEA]" : "bg-rd-mint-soft"
      }`}
    >
      <Mascot mood={urgent ? "concerned" : "calm"} size={28} />
    </span>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
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
  /** 다른 아이 지칭 감지 시 확인 카드 (지시서 P0-1). 질문을 들고 있다가 선택에 따라 보낸다 */
  const [mentionCheck, setMentionCheck] = useState<{
    other: Cat;
    question: string;
    image: string | null;
  } | null>(null);
  const [allCats, setAllCats] = useState<Cat[]>([]);
  /** 이 기기 기준 오늘 질문 수 — 안내용 (lib/chatUsage.ts 주석) */
  const [used, setUsed] = useState(0);
  /** 카운터 저장 키의 사용자 구분 — 게스트 사용분이 계정 카운터에 섞이지 않게 */
  const [usageScope, setUsageScope] = useState("guest");
  /** 티어별 한도 (D-24) — 게스트 3 / 로그인 10. 회원값으로 시작해 판별되면 갱신 */
  const [dailyLimit, setDailyLimit] = useState(FREE_DAILY_QUESTIONS);
  /** 전송 실패 안내 — 조용히 사라지면 버튼이 고장난 걸로 보인다 */
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** 스크롤이 바닥 근처인가 — 긴 대화에서 강제 스크롤로 읽던 위치를 뺏지 않기 위해 */
  const nearBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /*
   * 다음 질문이 어디서 왔는지 (지표용, 0008). 질문 내용은 보내지 않고 이 구분값만 남긴다.
   * prefill = 다른 화면에서 ?q=로 넘어온 것, suggested = 추천 질문, input = 직접 입력.
   */
  const sourceRef = useRef<"input" | "suggested" | "prefill">("input");

  function showToast(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  }

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
      setAllCats(await storage.listCats());
      const sessions = await storage.listSessions(catId);
      const last = sessions[sessions.length - 1];
      if (last) {
        setSessionId(last.id);
        setMessages(await storage.listMessages(last.id));
      }
    })();
    // 카운터 키는 사용자별 — 게스트 사용분이 계정 카운터로 넘어오지 않는다 (QA #4)
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        const scope =
          data.user && data.user.is_anonymous === false
            ? data.user.id.slice(0, 8)
            : "guest";
        setUsageScope(scope);
        setUsed(loadChatUsage(scope));
      })
      .catch(() => setUsed(loadChatUsage()));
    void getTier().then((tier) =>
      setDailyLimit(tier === "member" ? FREE_DAILY_QUESTIONS : GUEST_DAILY_QUESTIONS),
    );
  }, [catId]);

  /*
   * 자동 스크롤 (QA #5) — 바닥 근처에 있을 때만 따라간다.
   * 긴 대화를 위로 읽는 중에 강제 스크롤하면 읽던 자리를 뺏는다.
   * 바닥에서 떨어져 있는데 새 메시지가 오면 "새 답변" 점프 버튼을 띄운다.
   */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowJump(false);
    } else if (messages.length > 0 || streaming !== null) {
      setShowJump(true);
    }
  }, [messages, streaming]);

  function jumpToBottom() {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    nearBottomRef.current = true;
    setShowJump(false);
  }

  // 홈/사진진단의 빠른 질문(?q=)·사진 요청(?photo=1)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setDraft(q);
      sourceRef.current = "prefill";
    }
    if (searchParams.get("photo") === "1")
      setTimeout(() => fileRef.current?.click(), 300);
  }, [searchParams]);

  /** 새 대화 — 다음 질문부터 새 세션에 쌓인다 (기존 세션은 지우지 않는다) */
  function resetChat() {
    setSessionId(null);
    setMessages([]);
    setStreaming(null);
    setPendingLog(null);
    setLogSaved(false);
    setMentionCheck(null);
    setDraft("");
    setPhoto(null);
  }

  async function send(text?: string, opts?: { skipMentionCheck?: boolean }) {
    const q = (text ?? draft).trim() || (photo ? "이 사진 좀 봐줄래요?" : "");
    if (!q || !cat || streaming !== null) return;

    /*
     * 개체 확인 게이트 (지시서 P0-1) — 질문에 다른 아이의 이름·별명이 보이면
     * 보내기 전에 멈추고 묻는다. 다른 아이 질문에 이 아이의 체중·기록으로
     * 답하는 것이 이 서비스에서 가장 신뢰를 깨는 실수라서다.
     */
    if (!opts?.skipMentionCheck) {
      const other = detectOtherCatMention(q, allCats, cat.id);
      if (other) {
        setMentionCheck({ other, question: q, image: photo });
        setDraft("");
        setPhoto(null);
        return;
      }
    }
    const img = photo;
    setDraft("");
    setPhoto(null);
    setPendingLog(null);
    setLogSaved(false);
    // 내가 보낸 메시지는 항상 바닥으로 — 위로 읽는 중이었어도 전송은 내 행동이다
    nearBottomRef.current = true;

    /*
     * 저장 실패는 입력을 되살리고 알린다 (QA #3) — 세션·메시지 insert가
     * 실패했을 때 조용히 끝나면 "Enter를 눌렀는데 글만 사라졌다"가 된다.
     */
    const userMsg: ChatMessage = {
      id: newId(),
      sessionId: sessionId ?? "",
      role: "user",
      content: q,
      imageUrl: img,
      model: null,
      createdAt: new Date().toISOString(),
    };
    let sid = sessionId;
    try {
      // 세션 없으면 생성
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
      userMsg.sessionId = sid;
      await storage.addMessage(userMsg);
    } catch (e) {
      console.warn("[chat] 전송 저장 실패", e);
      setDraft(q);
      setPhoto(img);
      showToast("전송하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
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
      // 저장이 실패해도 응급 안내는 보여준다 — 안내가 저장보다 중요하다
      await storage.addMessage(alertMsg).catch(() => {});
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

    /*
     * 2단계: LLM 호출 + 스트리밍 렌더.
     * 카운터는 AI를 실제로 호출할 때만 올린다 — 룰엔진 응답(위)은 서버가 세지
     * 않으므로 여기서도 세지 않아야 화면과 차단 시점이 일치한다.
     * 서버가 실카운트를 보내면(usage) 그 값으로 덮어쓴다.
     */
    setUsed(bumpChatUsage(usageScope));
    // 재사용률 지표 (0008) — 카운터와 같은 시점(AI 실호출)에 센다. 질문 본문은 안 보낸다
    track("chat_asked", {
      scope: usageScope === "guest" ? "guest" : "account",
      source: sourceRef.current,
    });
    sourceRef.current = "input";
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    const res = await llm.ask({ cat, history, question: q, image: img });
    if (res.usage) {
      setUsed(res.usage.used);
      setDailyLimit(res.usage.limit);
      syncChatUsage(res.usage.used, usageScope);
    }
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
      kbRefs: res.kbRefs,
      createdAt: new Date().toISOString(),
    };
    // 저장이 실패해도 화면의 답변은 유지한다
    await storage.addMessage(botMsg).catch(() => {});
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

  const canSend = streaming === null && (!!draft.trim() || !!photo);

  return (
    <main className="flex h-dvh flex-col bg-rd-page">
      {/* 헤더 */}
      <header className="flex-none border-b border-rd-line bg-white pt-[max(8px,env(safe-area-inset-top))]">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <BackButton
            fallback={`/cats/${catId}`}
            icon="chevron"
            className="!min-w-9 !px-0 text-rd-ink"
          />
          <span className="flex size-9.5 flex-none items-center justify-center overflow-hidden rounded-full bg-rd-mint-soft">
            <Mascot mood="happy" size={34} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-extrabold tracking-[-0.02em] text-rd-ink">
              냥박사
            </span>
            <span className="mt-px block truncate text-[11.5px] font-medium text-rd-muted">
              {cat.name}를 아는 건강 도우미
            </span>
          </span>
          <button
            type="button"
            onClick={resetChat}
            className="flex-none p-2 text-[12px] font-semibold text-rd-muted"
          >
            새 대화
          </button>
        </div>
      </header>

      {/* 메시지 리스트 — grid로 둬야 자식이 flex-shrink로 눌리지 않는다 */}
      <div
        ref={listRef}
        onScroll={() => {
          const el = listRef.current;
          if (!el) return;
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          nearBottomRef.current = near;
          if (near) setShowJump(false);
        }}
        className="grid min-h-0 flex-1 auto-rows-max gap-3 overflow-y-auto px-4 pt-4.5 pb-2"
      >
        {messages.length === 0 && streaming === null && (
          <>
            {/* 빈 상태 — 귀여운 냥박사 */}
            <div className="rounded-3xl bg-white px-5 py-6.5 text-center">
              <Mascot mood="happy" size={96} className="mx-auto" />
              <p className="display mt-2.5 mb-1.5 text-[19px] text-rd-ink">
                무엇이든 물어보세요
              </p>
              <p className="text-[13px] leading-[1.65] text-rd-muted">
                {cat.name}의 나이·기록을 아는 냥박사가
                <br />
                사료·행동·건강 신호까지 살펴드려요.
              </p>
            </div>
            {/* 추천 질문 — 프로필 기반 (T-08) */}
            <p className="mx-0.5 -mb-1 text-[12px] font-bold text-rd-faint">
              이런 게 궁금하다면
            </p>
            {getSuggestedQuestions(cat).map((q) => (
              <button
                key={q}
                onClick={() => {
                  sourceRef.current = "suggested";
                  void send(q);
                }}
                className="flex w-full items-center gap-2.5 rounded-[18px] bg-white px-4 py-3.5 text-left active:scale-[0.99]"
              >
                <span className="size-1.5 flex-none rounded-full bg-rd-mint" aria-hidden />
                <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-rd-ink">
                  {q}
                </span>
              </button>
            ))}
          </>
        )}

        {messages.map((m) =>
          m.model === "rule-engine" ? (
            /* 레드플래그 고정 응답 — 룰 엔진이 AI 없이 낸 응급 안내 (F-09) */
            <div key={m.id} className="flex items-start gap-2">
              <BotAvatar urgent />
              <div className="flex max-w-[86%] flex-col gap-2.5 rounded-[20px] rounded-bl-md border-[1.5px] border-[#FFC9BF] bg-[#FFF5F3] p-3.5">
                <p className="text-[11px] font-extrabold tracking-[0.02em] text-[#D6452F]">
                  🔴 지금 바로 병원
                </p>
                <p className="text-[13.5px] leading-[1.65] tracking-[-0.01em] whitespace-pre-wrap text-rd-ink text-pretty">
                  {clean(m.content)}
                </p>
                <a
                  href={EMERGENCY_MAP_URL}
                  target="_blank"
                  rel="noopener"
                  className="flex h-11.5 items-center justify-center gap-1.5 rounded-[14px] bg-rd-danger text-[14px] font-extrabold text-white"
                >
                  🗺️ 가까운 24시 동물병원 찾기
                </a>
              </div>
            </div>
          ) : m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-[20px] rounded-br-md bg-rd-ink px-3.5 py-2.5 text-[14px] leading-[1.6] tracking-[-0.01em] whitespace-pre-wrap text-white">
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="첨부 사진" className="mb-2 max-h-52 rounded-md" />
                )}
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-2">
              <BotAvatar />
              <div className="max-w-[86%] rounded-[20px] rounded-bl-md bg-white p-3.5">
                <AnswerBlocks content={m.content} refs={m.kbRefs} />
              </div>
            </div>
          ),
        )}

        {streaming !== null && (
          <div className="flex items-end gap-2">
            <BotAvatar />
            {streaming === "" ? (
              /* 타이핑 — 점 3개 */
              <span className="flex gap-1.5 rounded-[20px] rounded-bl-md bg-white px-4.5 py-3.5">
                {[0, 0.2, 0.4].map((d) => (
                  <span
                    key={d}
                    className="size-[7px] rounded-full bg-[#C9CEC9]"
                    style={{ animation: `dot-blink 1.2s ease-in-out ${d}s infinite` }}
                  />
                ))}
              </span>
            ) : (
              <div className="max-w-[86%] rounded-[20px] rounded-bl-md bg-white p-3.5">
                <AnswerBlocks content={streaming} />
              </div>
            )}
          </div>
        )}

        {/* 개체 확인 — 다른 아이 이름이 질문에 보일 때 (지시서 P0-1) */}
        {mentionCheck && streaming === null && (
          <div className="rounded-[20px] border border-[#F5E2A8] bg-[#FFF9E8] p-4">
            <p className="text-[14px] font-extrabold tracking-[-0.02em] text-rd-ink">
              {mentionCheck.other.name} 얘기가 맞을까요?
            </p>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-rd-body">
              지금은 {cat.name} 상담창이에요. {mentionCheck.other.name} 기준으로
              보려면 {mentionCheck.other.name}의 프로필·기록으로 봐야 정확해요.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const mc = mentionCheck;
                  setMentionCheck(null);
                  router.push(
                    `/cats/${mc.other.id}/chat?q=${encodeURIComponent(mc.question)}`,
                  );
                }}
                className="h-11.5 flex-1 rounded-[14px] bg-rd-ink text-[14px] font-extrabold text-white"
              >
                {mentionCheck.other.name}로 전환
              </button>
              <button
                onClick={() => {
                  const mc = mentionCheck;
                  setMentionCheck(null);
                  setPhoto(mc.image);
                  void send(mc.question, { skipMentionCheck: true });
                }}
                className="h-11.5 flex-1 rounded-[14px] border border-[#C7D6D0] bg-white text-[14px] font-semibold text-rd-body"
              >
                {cat.name} 그대로
              </button>
            </div>
          </div>
        )}

        {/* 대화→증상 기록 원탭 제안 (T-10) */}
        {pendingLog && streaming === null && (
          <div className="rounded-[20px] border border-rd-mint-line bg-rd-mint-soft p-4">
            <p className="mb-2.5 text-[14px] font-extrabold tracking-[-0.02em] text-rd-ink">
              📓 오늘 대화를 {cat.name}의 기록으로 남길까요?
            </p>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {pendingLog.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-rd-ink"
                >
                  #{t}
                </span>
              ))}
            </div>
            <p className="mb-3.5 text-[12px] leading-[1.6] text-[#5D6862]">
              기록이 쌓이면 &ldquo;평소랑 다른지&rdquo;를 알려드릴 수 있어요.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void saveSymptomLog()}
                className="h-11.5 flex-1 rounded-[14px] bg-rd-ink text-[14px] font-extrabold text-white active:scale-[0.99]"
              >
                기록 남기기
              </button>
              <button
                onClick={() => setPendingLog(null)}
                className="h-11.5 rounded-[14px] border border-[#C7D6D0] px-4.5 text-[14px] font-semibold text-rd-body"
              >
                괜찮아요
              </button>
            </div>
          </div>
        )}
        {logSaved && (
          <p className="rounded-[14px] bg-rd-mint-soft p-3 text-center text-[13px] font-bold text-rd-ink">
            🐾 기록했어요! 다음 답변부터 이 기록을 함께 볼게요.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 새 답변 점프 — 위로 읽는 중에 새 메시지가 왔을 때 (QA #5) */}
      {showJump && (
        <div className="relative">
          <button
            type="button"
            onClick={jumpToBottom}
            className="absolute -top-12 left-1/2 z-20 -translate-x-1/2 rounded-full bg-rd-ink px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_6px_18px_-4px_rgba(0,0,0,.4)]"
          >
            ↓ 새 답변 보기
          </button>
        </div>
      )}

      {/* 전송 실패 등 안내 */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-28 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-rd-ink px-4 py-2.5 text-[13px] font-semibold text-white [animation:toast-in_.2s_ease]"
        >
          {toast}
        </div>
      )}

      {/* 입력 바 */}
      <div className="flex-none border-t border-rd-line bg-white px-4 pt-3 pb-[max(8px,env(safe-area-inset-bottom))]">
        {/* 첨부 사진 미리보기 */}
        {photo && (
          <div className="mb-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="첨부" className="size-14 rounded-[14px] object-cover" />
            <span className="text-[12px] font-medium text-rd-ink">사진 첨부됨</span>
            <button
              onClick={() => setPhoto(null)}
              aria-label="첨부한 사진 제거"
              className="-my-2 ml-auto flex min-h-11 items-center gap-1 px-2.5 text-[12px] text-rd-muted"
            >
              <IconClose size={12} /> 제거
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
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
            className="flex size-11 flex-none items-center justify-center rounded-[14px] bg-rd-page text-rd-muted active:scale-95"
          >
            <IconCamera size={21} dotFill="#F4F5F2" />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) void send();
            }}
            placeholder={photo ? "사진에 대해 물어보세요 (선택)" : `${cat.name}에 대해 물어보세요`}
            className="h-11 min-w-0 flex-1 rounded-[14px] bg-rd-page px-4 text-base text-rd-ink placeholder:text-rd-faint focus:outline-none"
          />
          <button
            onClick={() => void send()}
            disabled={!canSend}
            className={`h-11 flex-none rounded-[14px] px-4 text-[14px] font-extrabold whitespace-nowrap active:scale-95 ${
              canSend ? "bg-rd-ink text-white" : "bg-[#EFF1ED] text-[#B4BAB5]"
            }`}
          >
            전송
          </button>
        </div>
        <p className="mt-2.5 text-center text-[11px] text-rd-faint">
          오늘 {Math.min(used, dailyLimit)}/{dailyLimit}회 사용 · 진단·처방은 수의사의 영역이에요.
        </p>
      </div>
    </main>
  );
}
