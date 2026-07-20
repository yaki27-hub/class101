"use client";

/* T-23 프로필 수정 — 기존 값 프리필 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import CatForm from "@/components/CatForm";
import { storage, type Cat } from "@/lib/storage";

export default function EditProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);

  useEffect(() => {
    void storage.getCat(id).then(setCat);
  }, [id]);

  if (cat === undefined) return null;
  if (cat === null)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-body">등록된 아이를 찾을 수 없어요.</p>
        <Link href="/" className="text-sm font-semibold text-ink underline">홈으로</Link>
      </main>
    );

  return <CatForm existing={cat} />;
}
