---
version: alpha
name: 찐집사 (JjinJipsa)
description: 반려묘 케어 앱 — 플랫 UI × 3D 마스코트. 도화지 크림 배경 + 흰 카드, 코랄은 주요 CTA 전용.
colors:
  # Surface
  canvas: "#FBFAF6"
  surface: "#FFFFFF"
  surface-card: "#FFFFFF"
  surface-soft: "#F5EFEA"
  surface-strong: "#EFE7DD"
  hairline: "#F0E5DE"
  # Text (순수 검정 금지)
  ink: "#403A39"
  secondary: "#403A39"
  body: "#6B635E"
  muted: "#7E7876"
  muted-soft: "#B8B0AC"
  # Brand
  primary: "#FF8D7B"
  primary-deep: "#E9705C"
  primary-soft: "#FFF0EB"
  butter: "#FFD97B"
  butter-soft: "#FFF8DF"
  mint: "#BFE7D8"
  mint-soft: "#EFF8F1"
  sky: "#CFEAFF"
  sky-soft: "#F0F8FF"
  sky-ink: "#5B9BC9"
  soft-pink: "#FFB7A8"
  # Semantic
  success: "#58A97B"
  warning: "#F4A261"
  error: "#F26B6B"
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
  xs: 8px
  sm: 12px
  md: 16px
  tile: 16px
  input: 18px
  button: 18px
  card: 20px
  xl: 24px
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
    textColor: "#FFFFFF"
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
    backgroundColor: "#FFF4EC"
    textColor: "{colors.primary}"
    rounded: "{rounded.tile}"
  bottom-nav:
    backgroundColor: "{colors.surface}"
    textColor: "#9A918D"
    typography: "{typography.tab-label}"
    height: 76px
---

# 찐집사 디자인 시스템

반려묘의 하루(밥·물·배변·활동)를 빠르게 기록하고, 마스코트 **냥박사**에게 건강·행동을
질문하는 케어 앱. 병원 앱처럼 딱딱하거나 공포감을 주지 않는 것이 원칙이다.

## 브랜드 시그니처

**플랫 UI × 3D 마스코트.** UI 요소는 전부 플랫(면색·둥근 모서리·그림자 최소)이고,
마스코트만 부드러운 3D 렌더다. 이 대비가 핵심이다.

## 컬러 사용 원칙

- 크림 도화지 배경(`canvas`) + 흰 카드(`surface`)가 기본
- **코랄(`primary`)은 주요 CTA에만** — 남용 금지
- `mint` = 정상, `sky` = 정보, `butter` = 보상·긍정
- `error`는 아껴서 사용. **순수 레드 금지, 순수 검정 텍스트 금지, 다크 배경 금지**
- 텍스트는 짙은 브라운 차콜(`ink #403A39`)

### 배경 질감

`canvas` 위에 채도 0의 fractal-noise를 아주 옅게(opacity ≈ 0.05) 올려 도화지 결을 표현한다.
구현: `.paper` 클래스 (SVG feTurbulence baseFrequency 0.9 → grayscale → opacity 0.05).

## 타이포그래피

- **제목은 Jua** (둥근 한글 디스플레이) — 화면 제목·카드 제목·로고·바텀시트 질문
- **본문·라벨은 Pretendard** (400/500/600/700)
- Jua는 단일 weight이므로 제목의 굵기 표기는 위계 참고용이다

## 그림자

그림자는 최소·아주 옅게. 대부분의 카드는 **그림자 없이 `1px hairline` 테두리**만 쓴다.
코랄 CTA만 예외적으로 `0 8px 20px rgba(255,141,123,0.35)`를 쓴다.

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
| 하단탭 비활성 라벨 | 3.08:1 | 아이콘+라벨 동시 제공. 활성 탭은 코랄로 명확히 구분 |
| 상태 타일 아이콘 색 | 2.1~2.6:1 | **아이콘 색**이며 라벨 텍스트는 `ink`(고대비). 체크/`!` 배지로 색 외 단서 제공 |
