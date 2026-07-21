"use client";

/* F-01 묘 프로필 입력 공용 폼 (T-22·T-23) — 등록(new)과 수정(edit) 공용 */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { newId, storage, type Cat, type Gender } from "@/lib/storage";
import { BREED_GROUPS, CONDITIONS } from "@/lib/catOptions";

export default function CatForm({ existing }: { existing?: Cat }) {
  const router = useRouter();
  const editing = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? "");
  const [birthEstimated, setBirthEstimated] = useState(
    existing?.birthEstimated ?? false,
  );
  const [gender, setGender] = useState<Gender>(existing?.gender ?? "unknown");
  const [neutered, setNeutered] = useState(existing?.neutered ?? false);
  const [breedGroup, setBreedGroup] = useState<string>(
    existing?.breedGroup ?? BREED_GROUPS[0],
  );
  const [weight, setWeight] = useState(
    existing?.weightKg != null ? String(existing.weightKg) : "",
  );
  const [conditions, setConditions] = useState<string[]>(
    existing?.conditions ?? [],
  );
  const [photo, setPhoto] = useState<string | null>(existing?.photo ?? null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = String(ev.target?.result ?? "");
      // 저장 전 압축: 최대 800px, JPEG — localStorage 한도(≈5MB) 초과 방지
      const img = new Image();
      img.onload = () => {
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return setPhoto(src);
        ctx.drawImage(img, 0, 0, w, h);
        setPhoto(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => setPhoto(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function toggleCondition(c: string) {
    setConditions((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  }

  async function save() {
    // 오픈 테스트: 최대 3마리 (신규 등록 시)
    if (!editing) {
      const count = (await storage.listCats()).length;
      if (count >= 3)
        return setError(
          "오픈 테스트 기간에는 최대 3마리까지 등록할 수 있어요. 기존 아이를 삭제한 뒤 등록해 주세요.",
        );
    }
    if (!name.trim()) return setError("이름을 입력해 주세요.");
    if (!birthDate)
      return setError("생일을 입력해 주세요. 모르면 추정 날짜도 괜찮아요.");
    const w = weight ? Number(weight) : null;
    if (weight && (Number.isNaN(w) || w! <= 0 || w! > 20))
      return setError("체중은 0~20kg 사이 숫자로 입력해 주세요.");

    const now = new Date().toISOString();
    const cat: Cat = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      birthDate,
      birthEstimated,
      gender,
      neutered,
      breedGroup,
      weightKg: w,
      conditions,
      indoor: existing?.indoor ?? true,
      avatar: existing?.avatar ?? null,
      photo,
      // 사진이 바뀌면 기존 일러스트는 무효화
      illust: photo === existing?.photo ? (existing?.illust ?? null) : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await storage.saveCat(cat);
    } catch {
      return setError(
        "저장 공간이 부족해요. 사진을 빼고 등록하거나, 다른 아이의 사진을 정리해 주세요.",
      );
    }
    router.push(`/cats/${cat.id}`);
  }

  const label = "text-sm font-semibold text-ink";
  const input =
    "h-11 w-full rounded-md border border-hairline bg-canvas px-4 text-base text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none";

  return (
    <main className="flex-1 space-y-6 px-5 py-8">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Profile
        </p>
        <h1 className="display mt-1 text-2xl text-ink">
          {editing ? "프로필 수정" : "우리 아이를 알려주세요"}
        </h1>
        <p className="mt-1 text-sm text-body">입력한 정보만큼 답변이 정확해져요.</p>
      </header>

      <div className="space-y-5">
        {/* 사진 업로드 */}
        <div className="space-y-1.5">
          <span className={label}>우리 아이 사진 (선택)</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-4 text-left"
          >
            <span className="flex size-[76px] flex-none items-center justify-center overflow-hidden rounded-[20px] bg-surface-card text-3xl">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="size-full object-cover" />
              ) : (
                "📷"
              )}
            </span>
            <span className="text-[13px] text-muted">
              탭해서 사진 {photo ? "바꾸기" : "올리기"}
              <br />
              <span className="text-muted-soft">나중에 AI 일러스트에도 쓰여요</span>
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhoto}
          />
        </div>

        <div className="space-y-1.5">
          <label className={label} htmlFor="cat-name">이름</label>
          <input id="cat-name" className={input} value={name}
            onChange={(e) => setName(e.target.value)} placeholder="예: 츄르" maxLength={12} />
        </div>

        <div className="space-y-1.5">
          <label className={label} htmlFor="cat-birth">생일</label>
          <input id="cat-birth" type="date" className={input} value={birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setBirthDate(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={birthEstimated}
              onChange={(e) => setBirthEstimated(e.target.checked)}
              className="size-4 accent-ink" />
            정확한 생일을 몰라요 (추정)
          </label>
        </div>

        <div className="space-y-1.5">
          <span className={label}>성별 · 중성화</span>
          <div className="flex gap-2">
            {([["male", "남아"], ["female", "여아"], ["unknown", "몰라요"]] as const).map(
              ([value, text]) => (
                <button key={value} type="button" onClick={() => setGender(value)}
                  className={`h-10 flex-1 rounded-md border text-sm font-semibold ${
                    gender === value ? "border-ink bg-ink text-white"
                      : "border-hairline bg-canvas text-body"}`}>
                  {text}
                </button>
              ),
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-body">
            <input type="checkbox" checked={neutered}
              onChange={(e) => setNeutered(e.target.checked)} className="size-4 accent-ink" />
            중성화 했어요
          </label>
        </div>

        <div className="space-y-1.5">
          <label className={label} htmlFor="cat-breed">품종 그룹</label>
          <select id="cat-breed" className={input} value={breedGroup}
            onChange={(e) => setBreedGroup(e.target.value)}>
            {BREED_GROUPS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className={label} htmlFor="cat-weight">체중 (kg)</label>
          <input id="cat-weight" className={input} value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="예: 4.2 (모르면 비워두세요)" inputMode="decimal" />
        </div>

        <div className="space-y-1.5">
          <span className={label}>건강에서 신경 쓰는 부분 (선택)</span>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" onClick={() => toggleCondition(c)}
                className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${
                  conditions.includes(c) ? "bg-ink text-white" : "bg-surface-card text-ink"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <button onClick={() => void save()}
        className="h-12 w-full rounded-md bg-ink text-sm font-semibold text-white active:bg-[#1f1f1f]">
        {editing ? "수정 완료" : "등록하기"}
      </button>
      <p className="text-center text-xs text-muted-soft">
        이 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
      </p>
    </main>
  );
}
