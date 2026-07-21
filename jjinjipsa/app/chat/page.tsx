"use client";

/* AI 상담 탭 — 첫 고양이의 챗봇으로 이동 (없으면 등록) */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { storage } from "@/lib/storage";

export default function ChatHub() {
  const router = useRouter();
  useEffect(() => {
    void storage.listCats().then((cats) => {
      router.replace(cats[0] ? `/cats/${cats[0].id}/chat` : "/profile/new");
    });
  }, [router]);
  return null;
}
