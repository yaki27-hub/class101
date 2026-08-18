"use client";

/*
 * "평소 모습" — 이 아이는 보통 어떤지 (모카 프로토타입의 아이 화면).
 *
 * 정보 소유(docs/정보구조.md 결): 이 화면은 **평소(베이스라인)의 서술**을 소유한다.
 * 오늘과의 비교는 홈(BaselineCard), 주 단위 집계는 주간 리포트가 소유한다.
 *
 * 내용은 전부 lib/usualProfile.ts가 기록에서 뽑은 것 — 이 화면은 그리기만 한다.
 * 시간대(아침/낮/저녁) 타임라인을 만들지 않은 이유도 그 파일 주석에 있다.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { storage, type Cat, type TraitAnswer } from "@/lib/storage";
import { loadNotes } from "@/lib/importantNotes";
import { buildLikes, buildUsualProfile, type UsualProfile } from "@/lib/usualProfile";
import TopBar from "@/components/TopBar";
import CatAvatar from "@/components/CatAvatar";

export default function UsualPage() {
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [profile, setProfile] = useState<UsualProfile | null>(null);
  const [likes, setLikes] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      const c = await storage.getCat(id);
      setCat(c);
      if (!c) return;
      setProfile(buildUsualProfile(id));
      const traits: TraitAnswer[] = await storage.listTraits(id).catch(() => []);
      const foodNotes = loadNotes(id)
        .filter((n) => n.category === "food")
        .map((n) => n.content);
      setLikes(buildLikes(traits, foodNotes));
    })();
  }, [id]);

  if (cat === undefined) return null;
  if (cat === null)
    return (
      <main className="flex flex-1 items-center justify-center px-6 pb-nav">
        <p className="text-sm text-rd-body">등록된 아이를 찾을 수 없어요.</p>
      </main>
    );
  if (!profile) return null;

  const days = cat.createdAt
    ? Math.floor((Date.now() - new Date(cat.createdAt).getTime()) / 86400000) + 1
    : null;

  return (
    <main className="flex-1 pb-nav">
      <TopBar back={`/cats/${cat.id}`} title={`${cat.name}의 평소 모습`} />

      {/* 히어로 — 사진이 있으면 크림으로 녹이고, 없으면 아바타 */}
      <div className="relative">
        {cat.photo ? (
          <div className="relative h-[240px] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cat.photo}
              alt={cat.name}
              className="absolute inset-0 size-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[55%]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(245,243,239,0) 0%, rgba(245,243,239,.7) 65%, #f5f3ef 100%)",
              }}
            />
          </div>
        ) : (
          <div className="flex justify-center pt-6">
            <CatAvatar cat={cat} size={96} radius={999} />
          </div>
        )}
        <div className="px-5 pt-1">
          <h1 className="display text-[26px] text-rd-ink">{cat.name}</h1>
          <p className="mt-0.5 text-[14px] font-medium text-rd-muted">
            {cat.name}의 평소를 알아가는 중이에요.
          </p>
          {days !== null && days > 0 && (
            <span className="mt-2 inline-block rounded-full bg-rd-forest px-3 py-1.5 text-[12px] font-bold text-white">
              함께 알아간 지 {days}일
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6 px-5 pt-6">
        {/* 보통 이래요 — 타임라인 문법 (세로 레일 + 점) */}
        <section>
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-rd-ink">
            {cat.name}는 보통 이래요
          </h2>
          {profile.known.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-rd-well px-4 py-4 text-[13.5px] leading-relaxed text-rd-body">
              아직 평소를 말할 만큼 기록이 쌓이지 않았어요. 오늘 상태를 며칠만
              기록하면 {cat.name}의 보통이 여기 채워져요.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {profile.known.map((it) => (
                <div key={it.key} className="flex gap-3.5">
                  <div className="flex w-2.5 flex-none flex-col items-center">
                    <span className="mt-1.5 size-2.5 rounded-full bg-rd-mint" aria-hidden />
                    <span className="mt-1 w-px flex-1 bg-rd-line" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="text-[12.5px] font-extrabold text-rd-muted">
                      {it.icon} {it.label}
                    </p>
                    <p className="mt-1 text-[15px] leading-[1.6] font-medium tracking-[-0.01em] text-rd-ink">
                      {it.sentence}
                    </p>
                    <p className="mt-1 text-[12.5px] text-rd-muted tabular-nums">
                      {it.evidence}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 좋아하는 것 — 집사가 직접 적은 것에서만 */}
        {likes.length > 0 && (
          <section className="rounded-3xl bg-rd-well p-5">
            <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
              🖤 {cat.name}가 좋아하는 것
            </h2>
            <ul className="mt-3 space-y-2">
              {likes.map((li) => (
                <li key={li} className="flex items-center gap-2.5">
                  <span className="size-1.5 flex-none rounded-full bg-rd-mint" aria-hidden />
                  <span className="text-[14px] font-medium text-rd-ink">{li}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-rd-muted">
              생활기록부와 꼭 기억할 것에 적어주신 내용이에요.
            </p>
          </section>
        )}

        {/* 요즘 조금 달라진 점 — 있을 때만. 방향은 말하지 않는다 */}
        {profile.changes.length > 0 && (
          <section>
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-rd-ink">
              요즘 조금 달라진 점
            </h2>
            <span className="mt-1.5 block h-1 w-11 rounded-full bg-rd-coral" aria-hidden />
            <div className="mt-3 rounded-2xl border border-rd-line bg-rd-card p-4">
              <ul className="space-y-2">
                {profile.changes.map((c) => (
                  <li
                    key={c.key}
                    className="text-[14px] leading-[1.6] font-medium text-rd-ink"
                  >
                    {c.icon} {c.sentence}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[12.5px] font-bold text-[#8B5F37]">
                👁 아직 일시적인 변화인지 더 보고 있어요.
              </p>
            </div>
          </section>
        )}

        {/* 아직 알아가는 중 — 표본 부족 항목 + 기록 CTA */}
        {profile.learning.length > 0 && (
          <section className="flex flex-col items-center gap-2.5 rounded-3xl bg-rd-well px-5 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-[20px]">
              🌱
            </span>
            <p className="text-[16px] font-extrabold text-rd-ink">
              아직 알아가는 중이에요
            </p>
            <div className="space-y-1">
              {profile.learning.map((l) => (
                <p key={l.key} className="text-[13px] font-medium text-rd-muted">
                  {l.sentence}
                </p>
              ))}
            </div>
            <Link
              href="/"
              className="mt-1.5 rounded-full bg-rd-forest px-5 py-2.5 text-[13px] font-bold text-white active:scale-[0.98]"
            >
              오늘 상태 기록하러 가기
            </Link>
          </section>
        )}

        <p className="pb-2 text-center text-[11.5px] leading-[1.6] text-rd-muted">
          전부 집사님이 기록한 것에서만 뽑았어요. 기록에 없는 것은 지어내지 않아요.
        </p>
      </div>
    </main>
  );
}
