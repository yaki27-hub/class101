/* 디자인 토큰 QA 페이지 (T-02, D-03 Clay 시스템) — 배포 화면 아님 */

const SURFACES = [
  { name: "canvas", cls: "bg-canvas border border-hairline", hex: "#FFFAF0", role: "페이지 기본 바닥" },
  { name: "surface-soft", cls: "bg-surface-soft", hex: "#FAF5E8", role: "푸터 · CTA 밴드" },
  { name: "surface-card", cls: "bg-surface-card", hex: "#F5F0E0", role: "크림 카드 · 배지" },
  { name: "surface-strong", cls: "bg-surface-strong", hex: "#EBE6D6", role: "강조 밴드" },
];

const BRAND = [
  { name: "pink", cls: "bg-brand-pink", text: "text-white", role: "챗봇 · 대화" },
  { name: "teal", cls: "bg-brand-teal", text: "text-white", role: "피처드 · 프리미엄" },
  { name: "lavender", cls: "bg-brand-lavender", text: "text-ink", role: "AI · 기록" },
  { name: "peach", cls: "bg-brand-peach", text: "text-ink", role: "따뜻한 일반" },
  { name: "ochre", cls: "bg-brand-ochre", text: "text-ink", role: "커뮤니티 · 팁" },
  { name: "mint", cls: "bg-brand-mint", text: "text-ink", role: "보조 배지" },
];

export default function StylePage() {
  return (
    <main className="flex-1 space-y-10 px-5 py-10">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Dev · Design Tokens (Clay)
        </p>
        <h1 className="display mt-2 text-[32px] text-ink">
          찐집사 스타일 샘플
        </h1>
        <p className="mt-2 text-sm text-body">
          크림 캔버스 · 니어블랙 잉크 · 브랜드 카드 6색 · Pretendard
        </p>
      </header>

      {/* 디스플레이 타이포 */}
      <section className="space-y-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Typography
        </h2>
        <p className="display text-[28px] text-ink">
          갑자기 시작된 인연도,
          <br />
          오래도록 걱정 없이.
        </p>
        <p className="text-base leading-[1.55] text-body">
          유튜브 300개 대신, 우리 애한테 맞는 것만. 츄르는 사람 나이 44세, 중년의
          문턱이에요.
        </p>
        <p className="text-sm text-muted">
          보조 텍스트 — 평소보다 잦아요, 살펴볼 신호예요.
        </p>
      </section>

      {/* 버튼 */}
      <section className="space-y-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Buttons
        </h2>
        <button className="h-11 w-full rounded-md bg-ink px-5 text-sm font-semibold text-white active:bg-[#1f1f1f]">
          궁금한 거 물어보기
        </button>
        <button className="h-11 w-full rounded-md border border-hairline bg-canvas px-5 text-sm font-semibold text-ink">
          오늘의 체크 답하기
        </button>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-card px-3 py-1.5 text-[13px] font-medium text-ink">
            7살부터 챙길 검진은?
          </span>
          <span className="rounded-full bg-surface-card px-3 py-1.5 text-[13px] font-medium text-ink">
            사료 급여량 계산
          </span>
          <span className="rounded-full bg-surface-card px-3 py-1.5 text-[13px] font-medium text-ink">
            물 얼마나 마셔야 해요?
          </span>
        </div>
      </section>

      {/* 브랜드 피처 카드 — 색 순환, 같은 색 연속 금지 */}
      <section className="space-y-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Feature Cards
        </h2>
        {BRAND.slice(0, 3).map((b) => (
          <div key={b.name} className={`rounded-xl ${b.cls} p-6 ${b.text}`}>
            <p className="text-[12px] font-semibold uppercase tracking-[1.5px] opacity-70">
              {b.name} · {b.role}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {b.name === "pink" && "내 고양이를 기억하는 챗봇"}
              {b.name === "teal" && "출처 있는 정보만, 광고 없이"}
              {b.name === "lavender" && "기록할수록 똑똑해져요"}
            </p>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2">
          {BRAND.map((b) => (
            <div
              key={b.name}
              className={`rounded-lg ${b.cls} px-2 py-3 text-center text-[11px] font-semibold ${b.text}`}
            >
              {b.name}
            </div>
          ))}
        </div>
      </section>

      {/* 서피스 */}
      <section className="space-y-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Surfaces
        </h2>
        <ul className="grid grid-cols-2 gap-2">
          {SURFACES.map((s) => (
            <li key={s.name} className={`rounded-lg ${s.cls} p-3`}>
              <p className="text-[13px] font-semibold text-ink">{s.name}</p>
              <p className="text-[11px] text-muted">
                {s.hex} · {s.role}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* 🚦 판정 시맨틱 */}
      <section className="space-y-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          판정 Semantic
        </h2>
        <div className="rounded-lg border border-error/30 bg-error/5 p-4">
          <p className="text-sm font-semibold text-error">🔴 지금 병원</p>
          <p className="mt-0.5 text-sm text-body">
            개구호흡은 기다리면 안 되는 신호예요. 지금 바로 이동해 주세요.
          </p>
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-semibold text-warning">🟡 24-48시간 관찰</p>
          <p className="mt-0.5 text-sm text-body">
            음수량과 감자 크기를 이틀만 지켜봐 주세요.
          </p>
        </div>
        <div className="rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-sm font-semibold text-success">🟢 홈케어 가능</p>
          <p className="mt-0.5 text-sm text-body">
            평소 패턴 안이에요. 지금처럼 지켜봐 주시면 돼요.
          </p>
        </div>
      </section>

      {/* 인풋 + 배너 */}
      <section className="space-y-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Input & Banner
        </h2>
        <input
          placeholder="츄르에 대해 궁금한 걸 물어보세요"
          className="h-11 w-full rounded-md border border-hairline bg-canvas px-4 text-base text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
        />
        <div className="rounded-lg bg-surface-soft p-4 text-sm text-body">
          🐾 <b className="text-ink">오늘의 체크</b> — 츄르는 평소 하루에 물을
          얼마나 마시나요?
        </div>
        <p className="text-xs text-muted-soft">
          이 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
        </p>
      </section>
    </main>
  );
}
