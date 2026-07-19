import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "찐집사 — 내 고양이를 기억하는 건강 챗봇",
  description:
    "우리 애 이거 먹어도 돼요?부터 얘 왜 이래요?까지 — 내 고양이를 기억하는, 편하게 물어보는 건강 챗봇.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-shell text-ink">
        {/* 모바일: 전체 화면 / 데스크톱: 420px 중앙 폰 프레임 */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col bg-bg sm:shadow-[0_0_60px_rgba(18,59,50,0.12)]">
          {children}
        </div>
      </body>
    </html>
  );
}
