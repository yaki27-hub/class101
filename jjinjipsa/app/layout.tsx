import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "찐집사 — 내 고양이를 기억하는 건강 챗봇",
  description:
    "우리 애 이거 먹어도 돼요?부터 얘 왜 이래요?까지 — 내 고양이를 기억하는, 편하게 물어보는 건강 챗봇.",
  applicationName: "찐집사",
  appleWebApp: { capable: true, title: "찐집사", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
  openGraph: {
    title: "찐집사 — 내 고양이를 기억하는 건강 챗봇",
    description:
      "갑자기 시작된 인연도, 오래도록 걱정 없이. 프로필·기록을 기억하는 고양이 건강 챗봇.",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffaf0",
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
          <AuthGate>{children}</AuthGate>
        </div>
      </body>
    </html>
  );
}
