# CLAUDE.md — Claude Code Project Guide

이 프로젝트는 독립적으로 판매할 **AI 비주얼 노블 제작 웹 서비스**다. `AGENTS.md`와 `docs/PRD.md`를 먼저 읽고 준수할 것. Claude 전용 규칙도 일반 에이전트 규칙보다 느슨해서는 안 된다.

## 실행 우선 순위
1. 사용자의 요구를 제품 이슈로 정리.
2. 변경 전 관련 파일/데이터 계약을 탐색하고 현재 동작 확인.
3. 화면 문제가 있다면 **raw → normalized → rendered** 세 단계 이미지를 확보.
4. 문제 원인을 생성 품질/투명도·정렬/합성/반응형 CSS로 분류.
5. 작은 패치, 회귀 테스트, 브라우저에서 확인.
6. 결과와 남은 위험을 한국어로 요약.

## 금지되는 지름길
- '프롬프트 강화하면 해결됨', '캐릭터 일치 100%' 같은 미검증 표현.
- 이미지 자체가 다르다는 근거 없이 anchor/scale/fade 숫자를 반복 조정.
- 비율 강제 변경, 서로 다른 포즈 파츠의 무조건 합성.
- 실패한 AI 결과를 자동 승인하거나 원본을 덮어쓰기.
- 기존 `second_ball`의 복잡한 paper-doll 합성 코드를 무검증 복사.
- 에셋 마스터/모델 버전/비용 로그 없이 API 호출.

## 작업 종료 보고 형식
- 변경: 관련 경로와 핵심 의도
- 검증: 테스트 명령·결과, 가능하면 before/after 캡처
- 미검증: 남은 한계, 재현 실패 케이스
- 배포/운영 영향: DB migration, 생성비용, 캐시 영향

## 첫 마일스톤
`docs/VALIDATION_PLAN.md`의 **1인물 × 1포즈 × 6표정** 테스트 하네스를 먼저 만들고, 원본/정규화/렌더링 오차를 계량화하자. 그 다음 캐릭터 스튜디오 UI로 확장한다.

## 문서 소유권
- 요구사항 변경: `docs/PRD.md` + `docs/PRODUCT_PLAN.md`
- 렌더링/에셋 변경: `docs/CHARACTER_ASSET_SPEC.md`
- 구조 변경: `docs/ARCHITECTURE.md`
- 실험 결과: `docs/VALIDATION_PLAN.md`
- 일정/범위 변경: `docs/ROADMAP.md`
