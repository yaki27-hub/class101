export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span aria-hidden className="text-5xl">🐈</span>
      <h1 className="display text-3xl text-ink">찐집사</h1>
      <p className="text-sm leading-relaxed text-body">
        갑자기 시작된 인연도, 오래도록 걱정 없이.
        <br />
        <span className="text-muted">(T-02 토큰 셸 — 화면은 다음 태스크부터)</span>
      </p>
      <p className="mt-8 text-xs text-muted-soft">
        이 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
      </p>
    </main>
  );
}
