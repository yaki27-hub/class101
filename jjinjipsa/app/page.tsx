export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span aria-hidden className="text-5xl">🐈</span>
      <h1 className="text-2xl font-bold text-pine-deep">찐집사</h1>
      <p className="text-sm leading-relaxed text-ink/70">
        내 고양이를 기억하는 건강 챗봇
        <br />
        (T-01 앱 셸 — 화면은 다음 태스크부터 채워집니다)
      </p>
      <p className="mt-8 text-xs text-ink/40">
        이 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
      </p>
    </main>
  );
}
