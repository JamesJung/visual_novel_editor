# PRD — Visual Novel Editor

버전: v0.1 / Draft / 2026-10-25
제품: 브라우저 기반 AI 캐릭터 제작 + 비주얼 노블/시뮬레이션 저작 SaaS

## 1. 목적과 범위
창작자가 캐릭터 마스터를 확정하고, 동일한 캐릭터의 표정/의상/포즈 에셋을 **버전과 공통 좌표계로 관리**하면서 분기형 비주얼 노블을 제작·배포하도록 한다. 프로젝트와 공통 엔진은 분리한다.

### 사용자
- 프로젝트 Owner: 과금/설정/배포/협업 관리.
- Editor: 인물/스토리/게임 규칙 관리.
- Viewer/Tester: 승인된 프리뷰 및 플레이테스트.

## 2. 주요 기능 요구사항

| ID | 우선 | 요구사항 | MVP 수용 기준 |
|---|---|---|---|
| P-01 | P0 | 프로젝트 생성/복제/설정 | 프로젝트별 데이터를 분리해 생성·수정·조회 가능 |
| C-01 | P0 | 캐릭터 프로필/마스터 관리 | 마스터 승인 후 불변 버전으로 저장; 새 버전 생성 가능 |
| C-02 | P0 | 1포즈 표정 세트 | neutral 포함 6표정을 마스터 기준 생성/업로드하고 개별 승인 |
| C-03 | P0 | 원본/정규화/최종 렌더 비교 | 3단계 나란히 비교, 원본 픽셀 크기·비율·앵커 표시 |
| C-04 | P0 | 에셋 검사와 품질 게이트 | 잘못된 크기/알파/비균일 스케일/정렬 오차 탐지; 수동 승인 |
| C-05 | P0 | 에셋 버전·추적성 | 이미지별 master 버전/모델/프롬프트/참조/비용/시간 기록 |
| S-01 | P0 | 씬·대사·선택지 에디터 | 배경/인물/표정/대사/선택지/다음 씬 저장 |
| S-02 | P0 | 변수·조건·효과 | 숫자/불리언/플래그와 조건부 분기 실행 |
| R-01 | P0 | 브라우저 게임 플레이어 | 동일 프로젝트 스키마로 씬 렌더 및 선택 결과 반영 |
| R-02 | P0 | 저장/불러오기·오류 안내 | 브라우저 단위 세이브, 누락된 에셋은 명시적 오류 |
| Q-01 | P0 | 미리보기/시각 회귀 | 표정 전환, 화면 크기, DPR 테스트 fixture 통과 |
| A-01 | P1 | 이미지 생성 공급자 어댑터 | API 교체/재시도/큐 관리, 사용량 기록 |
| C-06 | P1 | 의상·포즈 variation | 뷰/포즈마다 별도 rig 계약, 교차 혼합 방지 |
| S-03 | P1 | 분기 그래프/도달성 검사 | 고립/순환/불가능 조건 경고 |
| B-01 | P1 | 게임 export | 정적 웹 번들/에셋 manifest 출력 |
| B-02 | P1 | 팀 협업·권한 | owner/editor/tester 분리 |
| B-03 | P2 | 결제 및 사용량 한도 | 계획된 과금 지표/초과 정책에 따른 운영 |

## 3. 캐릭터 프로세스
1. 이름/외형/성격/역할 정의 → 첫 master 생성 또는 업로드.
2. 사용자가 master v1 승인. 이후 불변.
3. 같은 포즈·뷰에서 표정별 생성/업로드, **원본 master 직접 참조**.
4. 자동 규격 검사(차원/alpha/crop/face bbox/anchor/스케일); 실패 상세 표시.
5. normalize: 비율 유지·캔버스 고정·기준점 일치. 자동 정렬 불가 시 수동 편집 요청.
6. preview: raw / normalized / rendered 비교.
7. 사용자 승인 → 게임에서만 approved 사용.
8. 교체는 새 버전으로 발행. 과거 씬의 승인 버전 참조 유지.

## 4. 상태 및 도메인 모델
- Project(id, ownerId, settings)
- Character(id, projectId, profile, styleGuideId)
- MasterVersion(id, characterId, canonicalView, status, sourceAssetId)
- Asset(id, characterId, masterVersionId, viewId, poseId, outfitId, expressionId, source/normalized, validation, status)
- Rig(viewId, canvasW/H, anchors, baseBbox, allowedDeformation)
- Scene(id, projectId, backgroundId, beats)
- Beat(type, actor, expression, text, choices, conditions, effects, next)
- Variable(name, type, initial, constraints)
- Build(id, projectId, manifest, status)
- GenerationJob(id, provider, model, inputHash, cost, outputAssetId, status)

## 5. 에디터 화면
프로젝트 대시보드 / 캐릭터 목록 / 마스터 승인 / 표정·의상 작업대 / 세 단계 비교·검수 / 씬 에디터 / 선택지 및 상태 변수 / 브라우저 플레이 테스트 / 빌드 내역 / 사용량.

## 6. 비기능 요구
- **안정성:** 이미지/메타데이터 쓰기는 원자적으로 관리, 실패 시 승인 버전 미변경.
- **성능:** 플레이 중 원격 AI 호출 없음; 사전 다운로드/캐시.
- **보안:** 프로젝트별 권한, 스토리지 signed URL, 업로드 크기/MIME 검증, 비밀키 서버 보관.
- **관측:** job ID와 단계별 실패 로그, 생성비용, 원본·정규화·렌더 결과 식별.
- **접근성:** 키보드로 주요 에디터/플레이어 조작, 모바일 플레이 지원.
- **법무:** 사용자 업로드 권리, 생성 모델 상업 사용 약관, 보관/삭제 정책 검토.

## 7. MVP 완수 조건
- 동일 인물 동일 포즈 6표정 fixture에 대한 크기/비율/앵커 검증을 통과하고 실패 이유를 UI에서 확인 가능.
- 최소 2캐릭터, 2배경, 10개 씬, 3개 선택 분기, 4개 상태 변수의 데모 제작·실행.
- 에셋 업로드·확정·재버전·롤백 가능; 원본 불변 및 임의 덮어쓰기 방지.
- 브라우저 화면 폭 변화에서 의도치 않은 비균일 변형 없음.
- 생성 품질은 사용자 승인 대상이며 별도의 정량 목표는 베이스라인 측정 뒤 확정.

## 8. 미결정
이미지 API와 비용, normalize 방식(랜드마크 자동/수동), 인물별 허용 오차, 스토리지 운영비, SaaS 요금, 웹 빌드 배포 정책은 PoC에서 결정한다.
