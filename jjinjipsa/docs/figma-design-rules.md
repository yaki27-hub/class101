# Figma ↔ 코드 연동 규칙 (디자인 시스템 분석)

Figma MCP로 이 프로젝트의 디자인을 그리거나(코드→디자인), Figma 시안을 구현할 때(디자인→코드)
참고하는 문서다. **토큰의 단일 출처는 DESIGN.md**이고, 이 문서는 그 구조를 Figma 작업
관점에서 풀어쓴 것이다. 값이 어긋나면 DESIGN.md · `app/globals.css`가 이긴다.

## 0. 한눈에

| 항목 | 값 |
|---|---|
| 프레임워크 | Next.js 16 App Router + React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 — 토큰은 `app/globals.css`의 `@theme` (설정 파일 없음) |
| 디자인 프레임 | **모바일 390×844 기준, 데스크톱은 420px 중앙 셸** (`app/layout.tsx`) |
| 서체 | 본문 Pretendard Variable(CDN) · 제목 Jua · 칠판 제목 한 줄만 Gaegu |
| 팔레트 3벌 | ① 크림/포레스트(기본) ② `rd-*` 리디자인(홈·상담·기록부 계열) ③ 칠판(생활기록부 전용) |
| 아이콘 | `components/icons.tsx` — 채움형 단일 세트, `Icon*` 네이밍 |
| 배포 | Vercel. CDN 별도 없음, 에셋은 `public/` 정적 서빙 |

## 1. 토큰 — 어디에 뭐가 있나

**파이프라인**: `DESIGN.md`(YAML frontmatter, @google/design.md 형식)
→ `npm run design:export` 로 Tailwind `@theme` CSS 생성 → `app/globals.css`와 수동 대조.
검사는 `npm run design:lint`. **토큰을 바꿀 때는 DESIGN.md 먼저, globals.css는 따라간다.**

### ① 기본 팔레트 — "크림 종이 위 스튜디오 스케치북" (D-22)

```css
/* app/globals.css @theme 발췌 */
--color-canvas: #fcfaf5;   /* 크림 종이 배경 */
--color-ink: #1a3300;      /* 포레스트 잉크 — 유일한 주색. 본문·제목·CTA·테두리 전부 */
--color-butter: #ffe95c;   /* 하이라이터 옐로우 — 마커 자국(강조). 버튼으로 쓰지 않는다 */
--color-mint / sky / soft-pink   /* 스티키노트 파스텔 — 드문드문만 */
--color-success: #2f7a4d;  --color-warning: #8f6200;  --color-error: #c0392b;
```

규칙 (Figma에서 그릴 때도 동일):
- **순수 검정 금지** — 텍스트 최저 톤이 `#1A3300` 계열
- 🚦 판정 색(성공/경고/위험)은 브랜드색과 분리, **하이라이터 옐로우를 판정 근처에 두지 않는다**
- 그림자 대신 **색 + 1px 테두리**(`--color-hairline: #cfcabb`)로 층을 가른다
- 라운드: 버튼 10 / 카드 12 / 네비 16 / pill 999 (`--radius-*`)

### ② rd-* 팔레트 — "날씨돌" 리디자인 화면 (홈·상담·프로필·주간·기록 계열)

```css
--color-rd-page: #f4f5f2;   /* 라이트 그레이 페이지 */
--color-rd-ink: #1a1a1a;    /* 이쪽은 순수에 가까운 잉크 */
--color-rd-forest: #0e5b41; /* 링크·보조 CTA */
--color-rd-mint: #6fd9c5;   /* 토글 on, 기록 점 */
```

두 팔레트는 **화면 단위로 갈린다** — 한 화면 안에서 섞지 않는다. 새 화면을 그릴 때는
그 화면이 어느 계열인지부터 정한다 (최근 화면은 대부분 rd-*).
무드별 런타임 색(홈 히어로 그라디언트)은 토큰이 아니라 `lib/homeMood.ts`가 든다.

### ③ 칠판 팔레트 — 생활기록부 한 화면 전용 (D-41)

토큰으로 승격하지 않고 `app/cats/[id]/report/page.tsx` 로컬 상수다:
`BOARD #2D4C18` · `CHALK #F2F5EF` · `ACCENT #F5E04A` · 등급 잉크 5색(진하기 순 아님).
보조선은 전부 점선(분필), 데이터만 실선. 캡처 대상이라 hex 자체 완결.

### 타이포

- 크림 계열: 제목 `.display`(Jua 400) — page-title 24 / section 20 / card-title 18,
  본문 Pretendard 15/500, 캡션 13
- rd-* 계열: Pretendard 단일, 굵기 600~800, 자간 `-0.01em`(본문) `-0.02em`(제목),
  숫자 `tabular-nums`. 크기는 11.5~22px 소수점 포함 픽셀 지정
- **Pretendard 700 이상 금지 규칙은 크림 계열에만** 적용된다 (rd-*는 800까지 쓴다)

## 2. 컴포넌트 구조

```
components/
  icons.tsx            # 채움형 아이콘 전부 (아래 §5)
  BottomSheet.tsx      # 공용 시트 — tone="paper"|"board"
  BackButton.tsx       # 공용 뒤로가기 — icon="arrow"|"chevron"
  Mascot.tsx           # 냥박사 3D 마스코트 (public/mascot/m1~7.png 매핑)
  CatAvatar.tsx        # 아바타 시스템 (털색×무늬×눈 SVG) — 핵심 브랜드 자산
  PersonalityRadar.tsx # 칠판 오각 레이더
  SquareReportCard.tsx # SNS 1:1 캡처 카드
  home/ chat/ auth/    # 화면별 카드·시트 (XxxCard, XxxSheet 네이밍)
```

- 아키텍처: 함수형 + Tailwind 클래스 직접 기술. CSS Modules·styled-components·스토리북 없음
- 화면(page.tsx)이 상태를 들고, 카드/시트는 props로 받는 표현 컴포넌트가 기본형
- **이미지 캡처 대상 컴포넌트**(SquareReportCard, 칠판 판, BrushMilestoneCard의 아트)는
  토큰 클래스 대신 **hex 인라인** — 어떤 테마 컨텍스트에서도 같은 그림이 나와야 한다
- 시트는 반드시 `BottomSheet` 재사용, 새로 만들지 않는다

## 3. 프레임워크·빌드

- Next.js 16 App Router (`app/` 라우팅), React 19, TypeScript strict
- Tailwind v4: `@import "tailwindcss"` + `@theme` + `@utility` (nav-overlay, pb-nav).
  **tailwind.config 파일이 없다** — 토큰 추가는 globals.css `@theme`에
- 빌드 `npm run build`(next build), 배포 Vercel, PWA(매니페스트) 
- ⚠️ 이 리포의 Next.js는 훈련 데이터와 다를 수 있다 — `node_modules/next/dist/docs/` 먼저 (AGENTS.md)

## 4. 에셋

```
public/
  mascot/m1~m7.png     # 냥박사 포즈별 — Mascot.tsx가 mood→파일 매핑
  scenes/*.png|webp    # 홈 무드 씬(sunny/cloudy/…) + 칠판 판(grass-clean.png)
  icon-192/512, apple-icon
```

- 참조는 절대 경로 문자열(`/mascot/m3.png`). `next/image` 대신 `<img>`를 쓰는 곳은
  캡처 대상(html-to-image가 원본 픽셀을 요구)이라 eslint-disable이 붙어 있다
- 씬은 png+webp 2벌. 캡처에 들어가는 배경은 **상단(데이터 자리)을 비워 둔다** — 장식이
  레이더 꼭짓점·차트와 헷갈리면 안 된다는 규칙 (D-41)
- 폰트·Pretendard는 CDN `<link>` (`app/layout.tsx`) — 번들에 없다

## 5. 아이콘

- 전부 `components/icons.tsx` 한 파일, **채움형(fill) 단일 스타일** — 라인·채움 혼용 금지
- 네이밍 `Icon` + 파스칼 명사 (IconCat, IconBowl, IconArrowLeft…)
- 시그니처 `{ size?: number; className?: string }`, 색은 `fill="currentColor"`로 부모 text 색 상속
- Figma에서 새 아이콘을 뽑을 때: 24×24 뷰박스, 채움형으로 그리고 이 파일에 추가한다.
  외부 아이콘 라이브러리를 붙이지 않는다

## 6. 스타일 방식

- Tailwind 유틸 + 임의값(`text-[12.5px]`, `rounded-[14px]`)이 표준. 전역 CSS는
  `app/globals.css` 하나 (질감 `.paper`, 애니메이션 keyframes, `.display`)
- 반응형: **모바일 퍼스트 단일 레이아웃.** 브레이크포인트 분기 대신 420px 셸로 고정 —
  Figma 프레임도 390×844 하나면 된다. 좌우 패딩 고정 + 내부 유동 폭으로 구현
- safe-area: 하단 알약 내비 위 화면은 `pb-nav` 유틸 필수 (iOS 홈 인디케이터 대응)
- 모션: `prefers-reduced-motion` 전역 존중. 시트 320/250ms, press `scale(.98)`.
  꾹꾹이 로더·발도장 등 마이크로 인터랙션은 제품 요구사항
- 터치 타깃 최소 44px

## 7. 프로젝트 구조·작업 규율

```
jjinjipsa/
  app/            # 라우트 (홈 / cats/[id]/{chat,log,report,weekly,edit} / records / account …)
  components/     # §2
  lib/            # 도메인 로직 전부 (storage 어댑터, llm, redFlags, homeMood, analytics…)
  docs/           # 기능명세·정보구조·트리아지 등 단일 출처 문서
  scripts/        # test-*.mjs 골든셋 테스트 (npm run test:*)
  supabase/migrations/
```

- **문서가 코드보다 먼저**: 새 화면·섹션은 `docs/정보구조.md`에 먼저 반영 (같은 정보를
  두 화면이 소유하지 않게), 기능은 PLAN.md에 있어야 만든다
- 결정은 DECISIONS.md (D-번호) — 디자인 결정 근거가 다 여기 있다.
  Figma 시안을 그릴 때 자주 걸리는 것: D-20(등급색은 우열 아님), D-22(크림 시스템),
  D-41(칠판), 건강 정보는 생활기록부에 넣지 않는다
- UI 카피는 전부 한국어·집사어. 건강 정보 화면엔 출처(source_name)와 면책 문구가 붙는다

## 8. Figma 작업 시 체크리스트

1. 어느 팔레트 화면인가 (크림 / rd-* / 칠판) — 섞지 않는다
2. 프레임 390×844, 좌우 패딩 20~22, 하단 내비 겹침 고려(88px+safe-area)
3. 색은 위 토큰에서만. 새 색이 필요하면 DESIGN.md에 먼저 제안
4. 제목 서체 규칙 (Jua / rd는 Pretendard 굵게 / 칠판 제목만 Gaegu)
5. 등급·판정을 진하기·좋고나쁨 순 색으로 그리지 않는다
6. 캡처(공유 이미지) 대상 화면은 배경까지 자체 완결로
