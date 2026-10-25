# Character Asset Contract v0.1

## 문제 정의
`JamesJung/second_ball`의 `lib/character_paper_doll.dart`는 body/overlay/face/hair 변형, `neckAnchor`, `headFade`, `neckPatches`, `spriteSize` 등을 사용한다. 머리 박스별 `sx=headBox.width/reference.width`, `sy=headBox.height/reference.height` 계산과 일부 `BoxFit.fill` 경로는 원본/표시 영역 비율이 다를 때 **비균일 확대 가능성**이 있다. 다만 실제 오류가 그 때문인지는 원본 이미지 실측 전에는 단정하지 않는다.

## 가장 중요한 규칙
1. **Master is immutable**: 사용자 승인 후 원본 교체 불가. 새로운 `masterVersion` 생성.
2. **각 view/pose는 자체 rig를 갖는다**: 측면 머리를 정면 몸과 혼합하지 않는다.
3. **동일 pose 표정은 동일 좌표계**: canvas, anchor, head bbox와 crop 기준을 공유한다.
4. **상대비율 보존**: 허용되지 않은 `scaleX != scaleY` 금지.
5. **안 보이는 자동 보정 금지**: 정렬 변환/마스크/검수 점수는 UI 노출.
6. **원본과 산출물 모두 저장**: source, normalized, rendered 각각 비교 가능.
7. **표정은 고정 에셋 전환이 MVP 기본값**: AI 생성 파츠를 실시간 조립하는 것은 후속 실험.

## 해상도 표준(제안, PoC에서 변경 가능)
- canonical pose canvas: `1024 × 1536 px` RGBA PNG 또는 무손실 WebP.
- studio 내부 가상 좌표: 원본 픽셀 좌표. 화면에서는 균일 비율로 축소.
- 좌표: 좌상단 (0,0), x는 오른쪽, y는 아래.
- anchor: 발바닥/몸 중심/목 연결/좌우 눈 중심/입 중심 중 사용 가능한 것만.
- neutral 기준 head bbox를 master Rig에 저장, 모든 표정은 동일 rig 및 crop.
- 표정 6종 예시: neutral/smile/frown/angry/crying/surprised.
- 앞머리/눈/입 분할 합성은 **정확히 정합되는 파츠가 있을 때만** 허용.

## Manifest 예시
```json
{
  "schemaVersion": "0.1",
  "characterId": "founder_001",
  "masterVersion": 1,
  "viewId": "front",
  "poseId": "standing",
  "outfitId": "casual",
  "expressionId": "angry",
  "canvas": {"width": 1024, "height": 1536},
  "masterAssetId": "asset-master-001",
  "sourceAssetId": "asset-original-angry-001",
  "normalizedAssetId": "asset-normalized-angry-001",
  "rig": {
    "bbox": [190, 110, 650, 1310],
    "headBbox": [330, 145, 360, 405],
    "anchors": {"eyeLeft": [435, 320], "eyeRight": [585, 320], "mouth": [510, 420], "neck": [510, 535]}
  },
  "transform": {"scale": 1.0, "rotateDegrees": 0, "translateX": 0, "translateY": 0},
  "validation": {"status": "review_required", "warnings": []},
  "approval": {"status": "pending"}
}
```
위 좌표는 가상의 데이터이며 실제 이미지의 랜드마크를 나타내지 않는다.

## 파이프라인
`master 생성/업로드 → 사용자가 master 승인 → master 직접 참조 expression 생성 → 검사 → 정규화 → 시각 비교 → 사용자 승인 → immutable publish`

### 검사 세부
- 파일 유효성: MIME, RGBA, 알파 채널, 가로세로, 파일 크기.
- 기하: canvas 일치, alpha bbox, anchor displacement, head bbox 크기 변화, rotation, aspect ratio.
- 시각 품질: 외곽선 ghosting, hair/neck seam, artifact, 얼굴 차이. 자동 임베딩만으로 정답 판정 금지.
- 합성: 지정 3종 viewport 및 DPR별 neutral/표정 전환 비교.
- 모든 검사에는 실패 코드와 수정 가이드 제공.
- 기하 임계값은 임의 수치로 고정하지 말고 검증 데이터셋의 실제 분포를 보고 확정.

## 리스크 별 대응
| 이상 | 분리 진단 | 조치 |
|---|---|---|
| 표정에 따라 얼굴 크기 변화 | raw 이미지 head bbox 비교 | 필요 시 동일 마스터 기반 재편집, uniform align |
| 얼굴이 늘어짐 | render transform과 source ratio 비교 | 비균일 transform 차단, bbox 수정 |
| 머리-목 이음매 노출 | source alpha/normalized mask 비교 | 적절한 경계 마스크, 승인 프리뷰 |
| 화면 폭마다 위치 변화 | 동일 가상 캔버스의 viewport 변환 비교 | 단일 행렬 적용 및 visual regression |
| 표정마다 다른 사람 | 원본과 AI 수정본의 눈·머리·인상 비교 | AI 재생성 또는 사용자가 승인한 수동 수정 |
| 의상 바꿀 때 머리 훼손 | 마스크 범위 및 원본 합성 비교 | 얼굴 불변 마스크/별도 의상 경로 |

## 파츠 모드(후속)
고정된 헤드 base + 눈/입/눈썹/머리카락 레이어는 **동일 포즈·동일 캔버스·기준점 검증** 뒤 활성화. 아무 표정이나 자동 분리해서 얹는 기능은 P0에서 제외.

## 버전 정책
`draft → review_required → approved | rejected`
승인한 version의 source/normalized/rig hash 고정. 재검수나 보정은 신규 derivative 생성. 마스터 업데이트는 영향 씬 목록 및 선택적 마이그레이션 제공.
