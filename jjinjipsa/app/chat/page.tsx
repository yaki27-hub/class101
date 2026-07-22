"use client";

/* AI 상담 탭 — 홈에서 고른 고양이의 챗봇으로 이동 (없으면 등록) */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resolveSelectedCat } from "@/lib/selectedCat";

export default function ChatHub() {
  const router = useRouter();
  useEffect(() => {
    void resolveSelectedCat().then((cat) => {
      router.replace(cat ? `/cats/${cat.id}/chat` : "/profile/new");
    });
  }, [router]);
  return null;
}
