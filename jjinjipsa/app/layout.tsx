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
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full bg-surface-strong text-ink">
        {/* 모바일: 전체 화면 / 데스크톱: 420px 중앙 폰 프레임 (내부는 크림 캔버스) */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col bg-canvas sm:border-x sm:border-hairline">
          {children}
        </div>
      </body>
    </html>
  );
}
