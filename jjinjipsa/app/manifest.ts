import type { MetadataRoute } from "next";

// PWA 매니페스트 (T-21) — 홈 화면에 앱처럼 설치 가능하게
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "찐집사 — 내 고양이 건강 챗봇",
    short_name: "찐집사",
    description: "내 고양이를 기억하는, 편하게 물어보는 건강 챗봇",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#fffaf0",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
