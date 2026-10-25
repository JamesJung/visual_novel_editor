# 검증 및 실험 계획 v0.1

## 목표
**AI 모델이 만든 이미지 자체의 문제인지, normalization 문제인지, 웹/Flutter 합성 문제인지 분리**하고 상용 워크플로의 실패율/수정 비용을 측정한다.

## A. 기존 프로젝트 회고 및 재현
참고 GitHub: `JamesJung/second_ball`
확인한 코드: `lib/character_paper_doll.dart`, `lib/character_art_catalog.dart`, `lib/scene_character_framing.dart`, `lib/scene_player.dart`.
이미 구현된 것: 표정별 렌더, 몸/헤드/헤어 합성, neck anchor, fade, camera transform.
**아직 확인 못한 것**: 실제 대표 캐릭터 이미지별 픽셀/랜드마크, atlas 배치 원본, runtime 결과 비교. 존재하지 않는 원인이나 성능을 단정하지 않는다.

### 수집할 테스트 fixture
- 최소 1명: neutral + 표정 5개, 같은 view/pose/outfit
- 가능하면 헤어/목 연결 문제가 있던 캐릭터 1명 추가
- 각 표정 raw, normalized, renderer screenshot, 관련 rig/meta
- 브라우저 뷰포트 390×844, 480×960, 1280×720; DPR 1·2

## B. 이미지 오차 계측
1. 모든 PNG/W​ebP 실제 width/height/alpha 범위를 추출.
2. neutral 대비 머리 bbox 폭/높이, 눈 간 거리, eye-mouth 거리, 중심 이동(픽셀 및 정규화 비율).
3. raw/normalized/rendered 순서대로 transform matrix 기록.
4. `scaleX / scaleY` 차이와 head-body 접합 영역의 시각 이상 탐지.
5. 같은 view에서 표정 빠른 전환 녹화/스크린샷.
6. 자동 추정 landmarks가 신뢰할 수 없으면 사람이 수동 위치를 지정하도록 fallback.

## C. 비교 실험
- E1: 같은 마스터 참조 기반 전체 표정 이미지 생성, **완성형 고정 이미지 전환**.
- E2: 마스터 이미지의 얼굴 변경 영역만 편집, canonical canvas 유지.
- E3: 분리형 파츠 합성(기존과 유사), anchor/rig 검사 강화.
표본 수와 모델별 비용을 기록. 생성 난이도가 다른 표정/헤어 포함.

## D. 결과표(실행 후 채움)
| Experiment | 동일인물 육안검수 합격률 | 비균일 왜곡 횟수 | 조립 접합 오류 | 에셋당 수정횟수 | 비용/시간 |
|---|---|---|---|---|---|
| E1 | TBD | TBD | TBD | TBD | TBD |
| E2 | TBD | TBD | TBD | TBD | TBD |
| E3 | TBD | TBD | TBD | TBD | TBD |

## E. 자동화 테스트
- Manifest schema validator / 잘못된 이미지 치수 fail.
- 같은 pose 표정 세트의 common rig 일치 검사.
- bbox 기준 affine transform과 uniform scale unit tests.
- renderer snapshots: neutral→smile→angry→neutral 시 scale/layout 변화 측정.
- 반응형 viewport, DPR, 캐시 로딩, missing asset test.
- 승인 자산 수정/삭제 불가 테스트.

## F. 판단 게이트
- 생성 결과의 정체성 오류: AI 워크플로 조정.
- 정규화 결과만 오류: alignment 알고리즘/사용자 편집 수정.
- 렌더 결과만 오류: renderer transform/clip/layout 수정.
- 품질/비용이 미달이면 복잡한 파츠 조합보다 고정 완성형 표정 채택.
- 모든 지표는 실제 베이스라인 측정 후 목표값 확정.
