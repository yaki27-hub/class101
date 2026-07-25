# 찐집사 KB 문서 템플릿 (v1.0)

> 질환 1개 = 마크다운 파일 1개. YAML frontmatter는 RAG 메타데이터 필터링 + "지금 병원 가야 하나?" 판단 로직에 직접 사용됩니다.
> 파일명 규칙: `kb/{category}/{slug}.md` 예: `kb/urinary/ckd.md`

---

## 템플릿

```markdown
---
# ── 식별 ──
doc_id: kb-urinary-001            # 카테고리 약어 + 일련번호
disease_ko: 질환 한글명
disease_en: English Name
aliases: [집사들이 쓰는 표현, 검색 별칭]   # RAG 검색 리콜 향상용
category: urinary                  # urinary/gi/infectious/endocrine/cardiac/respiratory/dental/skin/eye/msk/neuro/oncology/behavior/emergency
tier: 1                            # 1~3

# ── 응급 판단 (챗봇 핵심 로직) ──
urgency_level: red                 # red / orange / yellow / green
urgency_triggers:                  # 이 증상이 언급되면 즉시 병원 안내
  - "증상 표현 1"
  - "증상 표현 2"
observe_ok_conditions:             # 경과 관찰 가능한 조건 (green/yellow만)
  - "조건 1"

# ── 리스크 프로파일 (개인 고양이 기록과 매칭) ──
age_risk: senior                   # kitten / adult / senior / all
sex_risk: male                     # male / female / all
breed_risk: [브리티시숏헤어]         # 없으면 []
risk_factors: [비만, 실내 단독 사육]

# ── 출처 관리 ──
sources:
  - name: Cornell Feline Health Center
    url: https://...
  - name: MSD Veterinary Manual
    url: https://...
last_reviewed: 2026-07
reviewed_by: 자체 작성               # 추후 수의사 감수 시 이름 기입
---

## 한 줄 요약
집사 눈높이로 이 질환이 무엇인지 1~2문장. (챗봇 첫 응답에 그대로 사용 가능한 수준)

## 주요 증상
- 초기 증상 (집에서 관찰 가능한 순서로)
- 진행 시 증상

## 🚨 지금 병원에 가야 하는 신호
frontmatter의 urgency_triggers를 풀어서 설명. 각 신호가 왜 위험한지 1문장씩.

## 경과 관찰해도 되는 경우
(green/yellow 질환만) 조건 + 관찰 기간 + "이렇게 되면 즉시 병원" 전환 조건.

## 원인
알려진 원인. 불명확하면 불명확하다고 명시 (과잉 확신 금지).

## 병원에서 하는 검사·치료
집사가 진료 전 마음의 준비를 할 수 있는 수준. 비용 언급은 하지 않음(병원별 편차).

## 홈케어 · 예방
사료/급수/화장실/환경 관리 등 실행 가능한 행동. 민간요법 언급 시 반드시 "권장하지 않음" 명시.

## 자주 묻는 질문
- Q: (네이버 카페 키워드 리서치에서 뽑은 실제 질문 패턴)
- A: 답변

## 출처
본문에서 참고한 출처 나열. 직접 인용·번역 전재 금지, 자체 서술만.
```

---

## 작성 규칙 (전 문서 공통)

1. **전재 금지** — 출처는 참고·크로스체크용. 문장은 100% 자체 작성. 표·그림 복사 금지.
2. **과잉 확신 금지** — 진단 단정 표현 금지. "~일 수 있어요", "~가능성이 있어 진료가 필요해요" 톤 유지.
3. **비용·처방 금지** — 약물 용량, 진료비는 절대 기재하지 않음 (병원 안내로 대체).
4. **urgency_triggers는 집사 언어로** — "핍뇨" ❌ → "화장실에 자주 가는데 소변이 거의 안 나와요" ⭕. 챗봇이 사용자 표현과 매칭해야 하므로.
5. **청킹 기준** — H2 섹션 단위로 청킹 (섹션당 300~800자 권장). frontmatter는 모든 청크에 메타데이터로 붙임.
6. **문서 길이** — 1,500~3,000자. 너무 길면 RAG 정확도 하락.

---

## 작성 예시 — 만성 신부전 (CKD)

```markdown
---
doc_id: kb-urinary-003
disease_ko: 만성 신부전
disease_en: Chronic Kidney Disease (CKD)
aliases: [신부전, 만성신장질환, 콩팥병, 크레아티닌 높음, SDMA 높음]
category: urinary
tier: 1
urgency_level: yellow
urgency_triggers:
  - "하루 이상 아무것도 먹지 않아요"
  - "구토를 하루 3회 이상 반복해요"
  - "축 늘어져서 움직이지 않아요"
  - "입에서 소변 냄새 같은 게 나요"
observe_ok_conditions:
  - "물을 많이 마시고 소변량이 늘었지만 식욕·활력은 정상인 경우 → 1주 내 건강검진 권장"
age_risk: senior
sex_risk: all
breed_risk: [페르시안, 아비시니안]
risk_factors: [7세 이상, 저수분 식이, 치주질환]
sources:
  - name: Cornell Feline Health Center
    url: https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center
  - name: IRIS (International Renal Interest Society)
    url: http://www.iris-kidney.com
last_reviewed: 2026-07
reviewed_by: 자체 작성
---

## 한 줄 요약
신장 기능이 서서히 떨어지는 노령묘의 대표 질환이에요. 완치는 어렵지만
조기에 발견하면 식이 관리로 진행 속도를 크게 늦출 수 있어요.

## 주요 증상
- 물을 많이 마시고 소변량이 늘어남 (가장 흔한 첫 신호)
- 체중이 서서히 빠짐, 털 윤기 감소
- 진행 시: 식욕 저하, 구토, 구취(요독 냄새), 무기력

## 🚨 지금 병원에 가야 하는 신호
- 하루 이상 완전 절식 → 지방간 합병 위험이 있어요
- 반복적인 구토, 축 처짐 → 요독증 악화 신호일 수 있어요
- 입에서 암모니아·소변 냄새 → 요독증이 상당히 진행된 신호예요

## 경과 관찰해도 되는 경우
음수량·소변량 증가만 있고 식욕과 활력이 정상이라면 응급은 아니에요.
다만 CKD 초기와 당뇨·갑상선 질환 모두 같은 증상을 보이므로
1주 이내 혈액검사(크레아티닌, SDMA)를 받아보는 것이 좋아요.

## 원인
노화에 따른 신장 조직의 점진적 손상이 가장 흔하고, 그 외 신우신염,
다낭신(유전), 신장 결석 등이 원인이 될 수 있어요. 개별 원인을
특정하기 어려운 경우도 많아요.

## 병원에서 하는 검사·치료
혈액검사(크레아티닌·BUN·SDMA), 소변검사(요비중·단백뇨), 혈압 측정,
초음파를 통해 IRIS 스테이지(1~4기)를 판정해요. 치료는 처방식(신장 사료),
수분 공급, 인 흡착제, 혈압 관리가 중심이에요.

## 홈케어 · 예방
- 음수량 늘리기: 분수형 급수기, 습식 사료 비중 확대
- 7세 이상은 연 1~2회 혈액검사로 조기 발견이 가장 중요해요
- 저단백 식이를 임의로 시작하지 마세요 — 스테이지에 따라 다르며
  수의사 판단이 필요해요

## 자주 묻는 질문
- Q: 신장 처방식을 안 먹으려고 해요
- A: 갑자기 바꾸면 거부가 흔해요. 기존 사료에 1~2주에 걸쳐 서서히
  섞어가며 전환하고, 그래도 거부하면 다른 브랜드 처방식을 시도해요.
  절식이 더 위험하므로 며칠간 전혀 안 먹으면 병원과 상의하세요.

## 출처
Cornell Feline Health Center — Chronic Kidney Disease,
IRIS Staging Guidelines 참고하여 자체 작성.
```
