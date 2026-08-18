"use client";

/*
 * 🔖 기억해둘게요 카드 (모카 프로토타입 이식) — 대화에서 증상 이야기가 나오면
 * "무엇을 기억해둘지"를 카드로 보여주고, 집사가 확정해야 기록된다.
 *
 * 모카 원안은 자동 저장 + "기억하지 않기"(사후 취소)지만, 여기서는 **저장 전에
 * 묻는다.** 태그 추출이 키워드 기반이라 "구토하면 병원 가야 해요?" 같은 가정
 * 질문도 잡히는데, 그걸 자동 저장하면 가짜 기록이 냥박사의 회상(<recent_symptom_logs>)
 * 을 오염시킨다 — "기록에 없는 것을 지어내지 않는다"는 원칙이 거꾸로 깨진다.
 * 모양은 모카, 확정은 집사. 이것이 이 카드의 경계다.
 *
 * [수정]은 증상 기록 화면으로 태그·메모를 미리 채워 보낸다 — 카드 안에서
 * 편집기를 또 만들지 않는다 (편집 화면은 이미 있다).
 */

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** 지금 시각 "오후 3:24" — 카드 헤더의 타임스탬프 */
function nowLabel(): string {
  return new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

export default function MemoryCard({
  tags,
  summary,
  saved,
  onSave,
  onEdit,
  onDismiss,
}: {
  tags: string[];
  /** 집사가 한 말 그대로 — 기록의 summary가 된다 */
  summary: string;
  /** true면 저장 완료 상태 (확인 표시만 남는다) */
  saved: boolean;
  onSave: () => void;
  onEdit: () => void;
  onDismiss: () => void;
}) {
  const headline = `${tags.join("·")} ｜ ${truncate(summary, 34)}`;

  if (saved) {
    return (
      <div className="rounded-[12px] border-[1.2px] border-rd-mint bg-white px-4 py-3">
        <p className="text-[12px] font-extrabold text-rd-forest">🔖 기억했어요</p>
        <p className="mt-1 text-[14px] font-bold tracking-[-0.01em] text-rd-ink">
          {headline}
        </p>
        <p className="mt-1 text-[12px] font-medium text-rd-muted">
          다음 상담부터 평소와 비교해서 같이 볼게요.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border-[1.2px] border-rd-mint bg-white px-4 py-3">
      <div className="flex items-center">
        <p className="text-[12px] font-extrabold text-rd-forest">🔖 기억해둘게요</p>
        <span className="min-w-0 flex-1" />
        <span className="text-[12px] font-medium text-rd-muted">오늘 {nowLabel()}</span>
      </div>
      <p className="mt-1.5 text-[14.5px] font-bold tracking-[-0.01em] text-rd-ink">
        {headline}
      </p>
      <p className="mt-1 text-[12.5px] leading-relaxed font-medium text-rd-muted">
        저장해두면 다음 상담에서 평소와 비교해 알려드려요.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          className="h-10 flex-1 rounded-[12px] bg-rd-forest text-[13.5px] font-extrabold text-white active:scale-[0.98]"
        >
          기억해두기
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="h-10 rounded-[12px] px-3.5 text-[13px] font-bold text-rd-forest active:opacity-70"
        >
          수정
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="h-10 rounded-[12px] px-3 text-[13px] font-semibold text-rd-muted active:opacity-70"
        >
          기억하지 않기
        </button>
      </div>
    </div>
  );
}
