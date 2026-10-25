# AGENTS.md — Coding Agent Instructions

이 저장소는 **상용 웹 기반 AI 비주얼 노블·시뮬레이션 제작 도구**다. 단일 야구 게임이 아니다.

## 읽는 순서
1. `README.md`
2. `docs/PRD.md`
3. `docs/CHARACTER_ASSET_SPEC.md`
4. `docs/ARCHITECTURE.md`
5. 작업별 `docs/VALIDATION_PLAN.md`, `docs/ROADMAP.md`

## 절대 원칙
- **문제 재현 전 보정 코드 추가 금지.** source asset, normalized asset, compositor output을 각각 캡처·비교.
- `characterId + masterVersion + viewId + outfitId + expressionId`가 에셋 식별의 기준.
- 승인된 master 및 derivative는 immutable; 변경은 새 버전으로 처리하고 기존 프로젝트를 깨지 않는다.
- 이미지의 종횡비를 암묵적으로 늘리는 `fill`/비균일 scale 금지. 명시적 사용자 승인/특수 효과가 아니라면 동일 x/y 스케일.
- 같은 포즈에서는 캔버스·앵커·얼굴 크기·카메라·컷 위치의 **불변 계약** 검사.
- AI 생성 결과를 자동으로 `approved` 상태로 만들지 말 것. 자동 검사 결과는 참고 신호이며 최종 사용자 승인 필요.
- 오류 시 재생성뿐 아니라 수동 정렬/교체/원복 제공; 사용자의 크레딧 소모를 투명하게 기록.
- 표정/의상 생성은 **마스터를 직접 참조**하고 파생물 연쇄 생성으로 drift를 누적하지 않는다.
- 데이터와 렌더러는 게임 장르와 무관하게 유지; 장르 로직은 플러그인으로 분리.
- 사용자가 요청하기 전 기존 `second_ball` 코드를 변경하지 않는다.

## 개발 워크플로
1. 이슈·목표·범위를 문서화한다.
2. 예상 입력 이미지, 메타데이터, 출력 아티팩트, 실패 케이스를 정의한다.
3. 테스트/fixture부터 작성한다. 동일 이미지 6표정 fixture로 픽셀/좌표 회귀 테스트.
4. 최소 기능 구현 → 브라우저 시각 테스트 → 생성비용/성능 측정.
5. 작업 전후 스크린샷과 검증 증거를 기록한다.
6. 문서·마이그레이션·계약 버전 동기화.

## MVP 기술 기본값(확정 전 제안)
- Frontend: Next.js + TypeScript; 에디터/플레이어는 분리 패키지.
- 2D 렌더링: Canvas/PixiJS 후보; 먼저 Canvas 2D로 기준 좌표 테스트.
- Backend: Node.js API + 작업 큐/워커; PostgreSQL + Object Storage.
- AI 공급자: 어댑터 인터페이스로 교체 가능하게. 특정 제공자 종속 금지.
- 이미지 처리: 서버에서 deterministic normalize/align, 사용자 미리보기.
- 패키지: `apps/web`, `apps/api`, `packages/core`, `packages/renderer`, `packages/asset-pipeline` 권장.

## PR/커밋 검수 체크
- [ ] 이전에 승인한 이미지 경로/버전 변경 없음
- [ ] raw/normalized/rendered 비교
- [ ] canvas, bbox, anchors, uniform scale 검증
- [ ] neutral ↔ smile ↔ angry 전환에서 팝/이동/늘어짐 없음
- [ ] 브라우저 폭 및 DPR 변화 테스트
- [ ] 실패/재시도/취소/중복 요청 처리
- [ ] 프로젝트별 권한/스토리지 분리
- [ ] 비밀키·생성 API 토큰 커밋 없음
- [ ] 관련 문서 갱신

## 에이전트 간 역할 예시
- Product/Story: 요구사항, 워크플로, 콘텐츠 모델
- Asset Pipeline: 참조·마스크·정규화·검수
- Renderer: 고정 좌표 합성, 전환, 시각 회귀
- Backend: 작업 큐, 데이터/버전, 권한/과금 계측
- QA: 이미지 fixture와 품질 메트릭
병렬 작업 시 데이터 계약을 먼저 합의하며 동일 파일 동시 수정을 피한다.
