@AGENTS.md

# 찐집사 (Jjinjipsa)

한국 고양이 집사를 위한 **"내 고양이를 기억하는 건강 챗봇"** 앱.
출처 있는 건강 정보 + 각 고양이의 기록(프로필·습관·증상)을 결합한다.

## 먼저 읽을 문서
- PLAN.md — 제품 개요, MVP 범위, 데이터 모델, 마일스톤, **미정 사항(인터뷰 대기열)**
- TASKS.md — 마일스톤별 태스크. **한 번에 하나만** 진행
- DECISIONS.md — 인터뷰로 확정된 결정 (D-00부터)
- docs/기능명세서_v2.md — 기능 상세의 단일 출처 (F-번호). 킥오프킷의 v1 스코프와 충돌 시 **v2가 우선**
- docs/킥오프킷.md — 디자인 토큰·컨벤션 원본

## 진행 규율 (중요)
- 문서가 코드보다 먼저. PLAN.md에 없는 기능은 만들지 않는다
- 미정 사항은 추측하지 말고 AskUserQuestion으로 인터뷰 (선택지 2~4개 + 장단점)
- 결정은 즉시 DECISIONS.md에 기록하고 PLAN/TASKS를 갱신
- 태스크 완료 = TASKS.md의 완료 기준이 눈으로 확인됨 + `npm run build` 통과
- PG 직접 연동 금지 — 판매는 Groble(groble.im) 링크 자리만
- API 키 없으면 mock 어댑터, 교체 지점은 파일 하나로 분리 (`lib/llm`)

## 스택 & 컨벤션 (D-01: PWA 먼저)
- Next.js 16 App Router + TypeScript + Tailwind v4. 배포 Vercel. PMF 후 Expo 전환 예정
- 모바일 퍼스트. 데스크톱에선 420px 중앙 셸 (app/layout.tsx의 프레임)
- 디자인 토큰 (app/globals.css @theme): pine #1E5C4F, pine-deep #123B32,
  pine-soft #DCEAE4, churu #F5C956, churu-soft #FBEFD2, salmon #F08A72,
  bg #F2F6F3, ink #1C2B27. 폰트: Pretendard Variable
- UI 카피는 한국어. 아바타 시스템(털색×무늬×눈 SVG)은 핵심 브랜드 자산
- 모든 건강 정보에 source_name(출처) 렌더링. 하단 고정 면책:
  "이 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다."
- 레드플래그는 AI 호출 **전** 룰 엔진에서 선차단 (비용 0·지연 0·오판 0)
- 귀여운 마이크로 인터랙션은 제품 요구사항 (꾹꾹이 로더, 발도장 등). prefers-reduced-motion 존중

## 저장 계층
- 엔티티별 타입 있는 get/set 어댑터(`lib/storage`) 뒤에 구현을 숨긴다
- M1~M2는 로컬(localStorage) 구현, M3에서 UI 무수정으로 Supabase 교체 (T-16)
