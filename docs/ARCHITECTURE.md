# 시스템 아키텍처 v0.1

## 원칙
**웹 에디터 / 게임 런타임 / 캐릭터 에셋 파이프라인 / 시뮬레이션 플러그인**을 독립 모듈로 구성한다. 모델 공급자를 추상화하고 immutable master/version을 기본으로 한다.

## 논리 구성
```text
[Next.js Editor] ---- [Node.js API] ---- [PostgreSQL]
       |                    |                  |
 [Web Preview]       [Job Queue/Worker]   [Object Storage]
       |                    |
 [2D Renderer]      [Provider Adapters]
       |                    |
 [Story Core]        [Generate / Normalize / Validate]
       |
 [Simulation Plugin: Baseball | Startup | Custom]
```

## 제안 모노레포
```text
apps/web/                 # SaaS 대시보드, 캐릭터/씬 에디터
apps/api/                 # auth, project, content, generation job, build API
apps/worker/              # 이미지 잡, normalize, validation, thumbnail
packages/schema/          # Zod + JSON schema, API/types 계약
packages/story-core/      # beat, choice, condition, effect, save state
packages/renderer/        # 2D scene compositing, preview, visual tests
packages/asset-pipeline/  # versioning, cropping, alignment, metadata
packages/provider-api/    # image model interface / adapters
packages/sim-base/        # 게임 규칙 플러그인 인터페이스
games/baseball-example/   # 검증 샘플(기존 게임 복제 아님)
games/startup-demo/       # 스타트업 경영 샘플
docs/
```

## 작업 상태 머신
`requested → queued → generating → normalizing → validating → review_required → approved/rejected`
실패 시 `failed` 상태와 원인 저장. 재시도는 새로운 attempt/operation ID로 기록하고, 승인된 asset 참조를 변경하지 않는다.

## 에셋 데이터 계약
- `source`: 원본 업로드/AI 결과, 변경 불가.
- `normalized`: 정규화된 크기/캔버스, 오리지널 참조와 변환 행렬 포함.
- `rendered`: 씬 렌더 결과/테스트 스냅샷, 생성 모델 산출물과 구분.
- 메타데이터: `characterId, masterVersion, viewId, poseId, outfitId, expressionId, canvas, bbox, anchors, pixelRatio, model, promptHash, status`.
- scene은 이미지를 직접 임의 경로로 사용하지 않고 승인 에셋 ID/버전 참조.

## 렌더러
1. master와 derivative의 좌표계를 검증.
2. normalize 단계에서 가능한 transform과 필요시 사용자 수동 수정.
3. 런타임은 **승인된 크기와 앵커** 그대로 배치; 암묵적인 aspect distortion 금지.
4. 화면 리사이즈 시 장면의 가상 캔버스에 단일 uniform transform 적용.
5. 배경 크롭과 캐릭터 스케일 변환 분리.
6. 합성 출력 화면캡처/검사와 에러 로깅.

## 저작 포맷
JSON schema 기반 versioned Project Manifest: `characters, assets, scenes, variables, rules, buildSettings`. runtime은 외부의 앱 개발 코드 없이 이 포맷을 해석한다.

## 게임 규칙 확장
`SimPlugin`은 `init(state)`, `actions(state)`, `apply(action,state)`, `describe(state)` 형태의 순수 함수 인터페이스를 목표로 하며 무한 루프/임의 서버 코드 실행 금지. 웹저작에서 규칙을 JSON 표현식으로 먼저 제공.

## API 초안
`POST /projects`, `GET /projects/:id`
`POST /characters`, `POST /characters/:id/masters`, `POST /assets/jobs`
`POST /assets/:id/validate`, `POST /assets/:id/approve`
`GET/PUT /scenes/:id`, `POST /builds`, `GET /jobs/:id`.
추후 OpenAPI로 확정.

## 운영 고려
- RLS 또는 동등한 테넌트 격리.
- API 키/KMS 관리, 악의적 프롬프트·파일 업로드 차단, 과금 상한.
- 잡 중복 방지(idempotency key), 모델 장애 backoff, 타임아웃.
- storage lifecycle, audit log, error/latency/cost metrics.
- 이미지 모델별 품질과 라이선스 차이; 특정 모델을 상수로 설계 금지.

## ADR (선행 결정 필요)
ADR-001: 플레이어 Canvas 2D vs PixiJS
ADR-002: 이미지/얼굴 랜드마크 정렬 툴 선택 및 애니메이션 캐릭터 적합성
ADR-003: AI 제공자별 API와 비용
ADR-004: 배포 방식 (정적 export vs hosted)
