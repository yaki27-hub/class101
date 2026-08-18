"use client";

/*
 * ↺ 어제 이야기했던 것 (모카 프로토타입) — 어제 증상 기록의 후속 질문.
 *
 * 답 세 개가 각자 실제 행동으로 이어진다 (답을 새 증상 기록으로 저장하지
 * 않는 이유는 lib/followup.ts 주석):
 *   다시 평소 같아요   → 오늘 상태 기록 시트를 연다 (회복은 오늘 기록이 말한다)
 *   아직 조금 달라요   → 냥박사 상담으로 (질문 프리필 — 기록과 같이 봐준다)
 *   다른 변화가 있어요 → 증상 기록 화면으로
 */

import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { saveFollowupAnswer, type FollowupPrompt } from "@/lib/followup";

export default function FollowupCard({
  catId,
  prompt,
  onAnswered,
  onOpenStatus,
}: {
  catId: string;
  prompt: FollowupPrompt;
  /** 답하고 나면 홈이 카드를 내린다 */
  onAnswered: () => void;
  /** "다시 평소 같아요" → 오늘 상태 시트 열기 */
  onOpenStatus: () => void;
}) {
  const router = useRouter();

  function answer(kind: "normal" | "still" | "new") {
    saveFollowupAnswer(catId, prompt.logId, kind);
    track("followup_answered", { answer: kind });
    onAnswered();
    if (kind === "normal") {
      onOpenStatus();
    } else if (kind === "still") {
      const q = `어제 기록한 ${prompt.tags.join("·")}, 오늘도 좀 이어지는 것 같아. 기존 기록과 같이 봐줘`;
      router.push(`/cats/${catId}/chat?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/cats/${catId}/log`);
    }
  }

  return (
    <section className="rounded-3xl bg-rd-card p-5">
      <p className="text-[11.5px] font-extrabold text-rd-muted">↺ 어제 이야기했던 것</p>
      <p className="mt-1.5 text-[15px] leading-[1.55] font-bold tracking-[-0.01em] text-rd-ink text-balance">
        {prompt.question}
      </p>
      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => answer("normal")}
          className="h-11 w-full rounded-[12px] bg-rd-well text-[14px] font-semibold text-rd-ink active:scale-[0.99]"
        >
          다시 평소 같아요
        </button>
        <button
          type="button"
          onClick={() => answer("still")}
          className="h-11 w-full rounded-[12px] bg-rd-well text-[14px] font-semibold text-rd-ink active:scale-[0.99]"
        >
          아직 조금 달라요
        </button>
        <button
          type="button"
          onClick={() => answer("new")}
          className="h-11 w-full rounded-[12px] bg-rd-well text-[14px] font-semibold text-rd-ink active:scale-[0.99]"
        >
          다른 변화가 있어요
        </button>
      </div>
    </section>
  );
}
