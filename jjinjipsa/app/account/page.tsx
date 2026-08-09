"use client";

/* 계정 설정 (D-10) — 로그인 상태·로그아웃·계정 탈퇴·문의/면책/버전 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { IconCat } from "@/components/icons";

const APP_VERSION = "v1.0 (오픈 테스트)";
const CONTACT_EMAIL = "melona-yolo@naver.com";

type AuthState = {
  linked: boolean; // 카카오 등으로 연결된 정식 계정
  nick: string;
  email: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const linked = !!u && u.is_anonymous === false;
      const nick =
        ((u?.user_metadata?.name || u?.user_metadata?.full_name) as string) || "집사";
      setAuth({ linked, nick, email: u?.email ?? null });
    });
  }, []);

  async function logout() {
    setBusy(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  /** 계정 탈퇴 — 모든 고양이·기록 삭제 후 로그아웃 */
  async function deleteAccount() {
    setBusy(true);
    try {
      const cats = await storage.listCats();
      for (const c of cats) await storage.deleteCat(c.id); // 동기화 행까지 삭제
      // 로컬 전용 키(오늘 케어·선택·습관 체크 등) 정리
      if (typeof window !== "undefined") {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("jjinjipsa:")) localStorage.removeItem(k);
        }
      }
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  if (auth === null) return null;

  return (
    <main className="flex flex-1 flex-col gap-3 px-5 pt-8 pb-nav">
      {/* 하단 탭에서 오는 화면이라 뒤로가기 없이 제목만 둔다 (홈 문법) */}
      <header className="mb-1">
        <h1 className="display text-[22px] text-rd-ink">설정</h1>
      </header>

      {/* 로그인 상태 */}
      <section className="rounded-3xl bg-rd-card p-5">
        <p className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
          로그인 상태
        </p>
        {auth.linked ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-rd-mint-soft text-rd-forest">
              <IconCat size={24} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-rd-ink">{auth.nick}님</p>
              <p className="truncate text-[12px] text-rd-muted">
                {auth.email ?? "카카오 계정 연결됨"}
              </p>
            </div>
            <span className="ml-auto rounded-full bg-rd-mint/60 px-2.5 py-1 text-[11px] font-semibold text-rd-ink">
              카카오 연결됨
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-[13px] text-rd-body">
              지금은 <b className="text-rd-ink">게스트</b>로 이용 중이에요.
              기록이 이 기기에만 저장돼요.
            </p>
            <Link
              href="/login"
              className="mt-3 flex h-11 items-center justify-center rounded-[14px] bg-[#FEE500] text-sm font-bold text-[#3A1D1D]"
            >
              카카오로 로그인하고 기록 지키기
            </Link>
          </div>
        )}
      </section>

      {/* 로그아웃 (연결된 계정만) */}
      {auth.linked && (
        <button
          onClick={() => void logout()}
          disabled={busy}
          className="rounded-[14px] border border-rd-line bg-white py-4 text-sm font-semibold text-rd-ink disabled:opacity-60"
        >
          로그아웃
        </button>
      )}

      {/* 문의 · 면책 · 버전 — 한 카드 안의 행 목록 (홈 문법) */}
      <section className="rounded-3xl bg-rd-card px-5">
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[찐집사] 문의")}`}
          className="flex items-center justify-between border-b border-rd-line-soft py-4 text-sm font-semibold text-rd-ink"
        >
          <span>문의하기</span>
          <span className="text-[12px] font-medium text-rd-muted">
            {CONTACT_EMAIL} ›
          </span>
        </a>
        <div className="border-b border-rd-line-soft py-4">
          <p className="text-[13px] leading-relaxed text-rd-muted">
            이 앱의 건강 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
          </p>
        </div>
        <div className="flex items-center justify-between py-4 text-sm font-semibold text-rd-ink">
          <span>버전</span>
          <span className="text-[12px] font-medium text-rd-muted">{APP_VERSION}</span>
        </div>
      </section>

      {/* 계정 탈퇴 — 게스트에겐 "탈퇴할 계정"이 없으므로 연결된 계정에만 보인다 */}
      {auth.linked && (
        <button
          onClick={() => setConfirmDel(true)}
          disabled={busy}
          className="mt-2 text-center text-[13px] font-semibold text-[#C4453A] underline disabled:opacity-60"
        >
          계정 탈퇴
        </button>
      )}

      <p className="text-center text-[11px] text-rd-faint">
        찐집사 · 내 고양이를 기억하는 건강 챗봇
      </p>

      {/* 탈퇴 확인 */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[340px] rounded-3xl bg-white p-6">
            <p className="text-lg font-bold text-rd-ink">정말 탈퇴할까요?</p>
            <p className="mt-2 text-sm leading-relaxed text-rd-body">
              등록한 <b>모든 고양이·사진·증상 기록·대화</b>가 지워지고
              되돌릴 수 없어요.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDel(false)}
                disabled={busy}
                className="h-11 flex-1 rounded-[14px] border border-rd-line text-sm font-semibold text-rd-body"
              >
                취소
              </button>
              <button
                onClick={() => void deleteAccount()}
                disabled={busy}
                className="h-11 flex-1 rounded-[14px] bg-rd-danger text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "처리 중…" : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
