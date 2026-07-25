"use client";

/*
 * 구 '사진 진단' 탭 — 냥박사 카드(홈)·챗 카메라로 통합되어 하단탭에서 제거됨.
 * 북마크/외부 링크로 들어온 사용자를 선택된 고양이의 사진 첨부 챗으로 보낸다.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { resolveSelectedCat } from "@/lib/selectedCat";

export default function DiagnoseRedirect() {
  const router = useRouter();
  useEffect(() => {
    void resolveSelectedCat().then((cat) => {
      router.replace(cat ? `/cats/${cat.id}/chat?photo=1` : "/profile/new");
    });
  }, [router]);
  return null;
}
