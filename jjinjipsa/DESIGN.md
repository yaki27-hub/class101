---
version: alpha
name: 찐집사 (JjinJipsa)
description: 반려묘 케어 앱 — 크림 종이 위 스튜디오 스케치북. 포레스트 잉크가 텍스트·CTA·테두리를 모두 짊어지고, 하이라이터 옐로우는 마커 자국, 파스텔은 스티키노트처럼 드문드문.
colors:
  # Surface
  canvas: "#FCFAF5"
  surface: "#FFFFFF"
  surface-card: "#FFFFFF"
  surface-soft: "#F2EFE4"
  surface-strong: "#E7E2D3"
  hairline: "#CFCABB"
  pencil: "#B6B6B6"
  whisper: "#F1F1F1"   # 면 전용 — 텍스트로 쓰면 크림 대비 1.08:1
  # Text (순수 검정 금지)
  ink: "#1A3300"
  secondary: "#1A3300"
  body: "#3D5424"
  muted: "#5F7349"
  muted-soft: "#657552"
  nav-inactive: "#5F7349"
  # Brand
  primary: "#1A3300"
  primary-deep: "#0E1C00"
  primary-soft: "#EEF3E4"
  butter: "#FFE95C"
  butter-soft: "#FFF8D0"
  mint: "#D5F5C2"
  mint-soft: "#EDFAE2"
  sky: "#A8E5E5"
  sky-soft: "#E8F7F7"
  sky-ink: "#2B6B6B"
  soft-pink: "#F6D0FF"
  terracotta: "#CB5521"
  # Semantic
  success: "#2F7A4D"
  warning: "#8F6200"
  error: "#C0392B"
typography:
  page-title:
    fontFamily: Jua
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.15
  section:
    fontFamily: Jua
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.2
  card-title:
    fontFamily: Jua
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: Pretendard
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.65
  caption:
    fontFamily: Pretendard
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.2
  tab-label:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
rounded:
  xs: 3px
  sm: 6px
  md: 12px
  tile: 12px
  input: 6px
  button: 6px
  card: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  card: 20px
  xl: 24px
  section: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    height: 52px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    height: 52px
  card-base:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  card-accent:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  question-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
  status-tile-unrecorded:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted-soft}"
    rounded: "{rounded.tile}"
  status-tile-normal:
    backgroundColor: "{colors.mint-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.tile}"
  status-tile-warning:
    backgroundColor: "{colors.butter-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.tile}"
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.nav-inactive}"
    typography: "{typography.tab-label}"
    height: 76px
---

# 찐집사 디자인 시스템

반려묘의 하루(밥·물·배변·활동)를 빠르게 기록하고, 마스코트 **냥박사**에게 건강·행동을
질문하는 케어 앱. 병원 앱처럼 딱딱하거나 공포감을 주지 않는 것이 원칙이다.

## 브랜드 시그니처

**크림 종이 위 스튜디오 스케치북 × 3D 마스코트.** UI는 전부 플랫이고 —
면색과 1px 테두리로 층을 가른다 — 마스코트만 부드러운 3D 렌더다. 이 대비가 핵심이다.

## 컬러 사용 원칙

- 화면의 95%는 **크림(`canvas`) + 포레스트 잉크(`ink`)**. 나머지가 악센트다
- **포레스트 잉크가 유일한 주색이다.** 본문·제목·링크·CTA 채움·테두리를 전부 짊어진다.
  두 번째 주색을 들이지 않는다
- **하이라이터 옐로우(`butter`)는 마커 자국이지 버튼이 아니다.** 강조할 낱말 뒤에 까는
  배경 워시·배지에만 쓰고, CTA 채움으로 쓰지 않는다
- 파스텔 3색은 **스티키노트**다 — 카드·배지 하나씩 띄엄띄엄. 큰 면을 덮지 않고,
  한 줄에 두 장을 나란히 두지 않는다. `mint` = 정상, `sky`(틸) = 정보, `soft-pink`(블러시) = 장식
- `error`는 아껴서 사용. **순수 검정 텍스트 금지, 다크 배경 금지**
- `whisper(#F1F1F1)`는 **면 전용이다.** 크림 위 대비가 1.08:1이라 텍스트로 쓰면 안 보인다

### 🚦 판정 색은 브랜드색과 분리한다

응급도(🔴🟡🟢)는 안전 신호라 브랜드 팔레트와 섞이면 안 된다.

| | 값 | 크림 대비 |
|---|---|---|
| success | `#2F7A4D` | 5.02:1 |
| warning | `#8F6200` | 5.14:1 |
| error | `#C0392B` | 5.21:1 |

**하이라이터 옐로우는 🟡 자리를 침범하므로 판정 UI 근처에 쓰지 않는다.**
셋은 명도가 비슷해 색각 이상에서는 구분이 약하다 — 그래서 판정에는 항상 🚦 이모지와
문구가 함께 간다. 색은 보조 신호일 뿐이다.

### 배경 질감

`canvas`(크림 종이) 위에 채도 0의 fractal-noise를 아주 옅게(opacity ≈ 0.05) 올려 도화지 결을 표현한다.
구현: `.paper` 클래스 (SVG feTurbulence baseFrequency 0.9 → grayscale → opacity 0.05).

## 타이포그래피

- **제목은 Jua** (둥근 한글 디스플레이) — 화면 제목·카드 제목·로고·바텀시트 질문
- **본문·라벨은 Pretendard** (400/500/600/700)
- Jua는 단일 weight이므로 제목의 굵기 표기는 위계 참고용이다

## 그림자

**층은 색과 1px 테두리가 가른다. 그림자가 아니다.** 대부분의 카드는 그림자 없이
`1px hairline` 테두리만 쓴다. blur 2px를 넘는 그림자는 이 시스템의 평면성을 깬다.

| 쓰는 곳 | 값 |
|---|---|
| 버튼 눌림 | `shadow-subtle` = `rgba(0,0,0,0.05) 0 1px 2px` |
| 보조 버튼 hover/active | `shadow-subtle-2` |
| 바텀시트 (유일한 예외) | `0 -2px 12px rgba(26,51,0,0.10)` — 화면을 덮는 층이라 분리가 필요하다 |

## 라운드 (버튼)

**라벨이 있는 버튼은 예외 없이 `rounded-button`(6px) 하나만 쓴다.** 같은 화면에서
pill과 사각 버튼이 섞이면 즉시 어색해 보이므로, 크기·중요도와 무관하게 통일한다.
0px 각진 모서리는 쓰지 않는다 — 6px과 섞이면 시스템이 무너진다.

`rounded-full`은 **형태 자체가 원/알약인 것**에만 허용한다:

| 용도 | 라운드 | 예 |
|---|---|---|
| 모든 버튼 (주·보조·작은 액션) | `button` 6px | 등록하기, 저장, 취소, 수정, 메모, 삭제 |
| 아이콘 전용 원형 버튼 | `full` | 기록 삭제 🗑, 카메라 |
| 선택 토큰(칩) | `full` | 추천 질문, 기저조건, 오늘의 체크 답변 |
| 카드 전체가 탭 영역 | `card` 12px | 계정 설정 행, 추천 질문 카드 |
| 바텀시트 옵션 행 | `13px` | 식사/물/배변/활동 선택지 |

판단 기준: **액션이면 버튼(6px), 선택 대상이면 칩(full).** "수정·메모·제거"는 작지만
액션이므로 버튼이다.

## 아이콘

**채움형(solid) 단일 스타일.** 둥글고 통통한 실루엣. 라인·채움 혼용 금지, 이모지를 UI
아이콘으로 쓰지 않는다.

카테고리 ↔ 색 매핑:

| 항목 | 아이콘 | 색 |
|---|---|---|
| 식사 | 밥그릇 | `success` |
| 물 | 물방울 | `sky-ink` |
| 배변 | 화장실 | `muted` (중립) |
| 활동 | 발바닥 | `primary` |

## 상태 타일

| 상태 | 배경 | 테두리 | 배지 |
|---|---|---|---|
| 미기록 | `surface` | `hairline` | — |
| 정상 | `mint-soft` | `mint` | 초록 원형 체크 |
| 주의 | `#FFF4EC` | `soft-pink` | 코랄 원형 `!` |

## 마스코트 (냥박사)

의사가 아니라 **집사와 함께 상태를 살펴보는 AI 고양이 도우미**. 위압적인 의사 가운은
쓰지 않는다. 표정 에셋 7종(`public/mascot/m1~m7.png`):

| 파일 | 표정 | 사용처 |
|---|---|---|
| m1 | 기본 | 아바타·챗 헤더·빈 대화 |
| m2 | 생각 | 냥박사 카드·로딩 |
| m3 | 기쁨 | 긍정 피드백 |
| m4 | 완료 | 오늘 기록 전부 완료 |
| m5 | 걱정 | 이상 기록 |
| m6 | 긴급 | 응급 안내 (무섭지 않게) |
| m7 | 빈 상태 | 기록·고양이 없음 |

화면당 마스코트는 최대 1~2개. 장식보다 **상태 안내** 역할이 우선이다.

## 모션

보조적으로만 사용하고 150~300ms로 제한한다. 바텀시트 슬라이드업, 버튼 press 스케일,
토스트 페이드는 허용. 반복되는 큰 애니메이션·경고 화면의 흔들림은 금지.
`prefers-reduced-motion`을 존중한다.

## 접근성

- 아이콘 버튼에 `aria-label` 필수
- **색만으로 상태를 구분하지 않는다** — 체크/`!` 배지나 텍스트를 함께 제공
- 터치 영역 최소 44×44
- 바텀시트는 열리면 내부 포커스 이동, ESC·배경 클릭으로 닫힘

## 구현 메모

런타임 토큰의 단일 출처는 `app/globals.css`의 `@theme` 블록이고, 이 문서가 그 근거를
담는다. 두 파일은 값이 일치해야 한다 (현재 불일치 0건).

```bash
npx @google/design.md lint DESIGN.md                      # 구조·대비 검사
npx @google/design.md export DESIGN.md --format css-tailwind   # @theme 생성 → globals.css와 대조
```

`globals.css`에는 위 토큰 외에 `brand-pink/teal/lavender/peach/ochre/mint` **레거시 별칭**이
남아 있다. 구버전 컴포넌트 호환용이며 신규 코드에서는 쓰지 않는다.

### 알려진 대비 이슈 (lint 경고)

핸드오프 팔레트를 그대로 따른 결과이며, 의도된 선택이다. 텍스트 가독성이 문제되는
지점은 별도로 보완한다.

| 대상 | 비율 | 메모 |
|---|---|---|
| 코랄 CTA 위 흰 글씨 | 2.25:1 | 버튼은 크고 굵어 실사용상 판독 가능. 소형 텍스트엔 코랄 배경 금지 |
| 상태 타일 아이콘 색 | 2.1~2.6:1 | **아이콘 색**이며 라벨 텍스트는 `ink`(고대비). 체크/`!` 배지로 색 외 단서 제공 |

**수정 완료:** 하단탭 비활성 라벨은 12px 실제 텍스트라 대비가 필요해, 핸드오프의
`#9A918D`(3.08:1)를 `nav-inactive #78716E`(**4.79:1, AA 통과**)로 조정했다. 웜그레이
색조는 유지된다.
