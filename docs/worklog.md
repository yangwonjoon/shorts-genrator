# Worklog

## 2026-03-29

이번 작업에서 아래 내용을 반영했다.

## 기능 변경

- `OpenAI provider` 구현 추가
  `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER=openai`로 스크립트 생성 가능하게 정리

- `스크립트 붙여넣기` 모드 추가
  외부 AI(ChatGPT/Claude 웹)에서 만든 JSON 스크립트를 붙여넣고
  `TTS -> 배경 영상 -> 합성`만 수행할 수 있게 변경

- `AI 프롬프트 복사` UI 추가
  앱 안에서 바로 복사 가능한 프롬프트를 제공해서
  외부 AI에 붙여넣고 JSON 결과를 다시 앱에 넣는 흐름 지원

- `generate-from-script` API 추가
  AI 단계 없이 수동 스크립트만 받아 렌더링 가능

- 공통 generation pipeline 분리
  기존 `/api/generate`의 TTS/영상/합성 로직을 재사용 가능하게 정리

- `스크립트 기반 후보 선택` UI 추가
  각 item마다 Pexels 후보를 확인하고 선택/재검색한 뒤 렌더링할 수 있게 변경

- `이력 상세 / 재시도 / 이어 시도` 추가
  job 상세 페이지에서 진행률, 진행 로그, 스크립트, 결과 영상 확인 가능
  실패 시 `재시도`, 멈춘 작업은 `이어 시도` 지원

- `이력 관리` 개선
  체크박스 선택 삭제, 현재 페이지 전체 선택, 페이지당 10개 pagination 추가

- `진행 로그 복사` 지원
  이력 상세의 로그를 그대로 복사해 문제 원인 공유 가능

- `Range streaming` 지원
  `/api/video/serve`가 부분 응답을 지원해서 영상 seek/중간 재생 가능하도록 수정

- `이미지 슬라이드 렌더링`으로 전환
  배경 소스를 Pexels video 대신 Pexels photo로 바꾸고, 대표 이미지 컷 편집 방식으로 변경

- `세그먼트 TTS 기반 싱크` 적용
  `hook / intro / 각 item / cta`를 개별 TTS로 생성하고 실제 길이로 슬라이드/자막 타이밍을 맞추도록 변경

- `intro 대표 이미지` 자동 검색 추가
  시작 구간이 너무 비어 보이지 않도록 intro용 이미지를 먼저 찾고, 없으면 안전한 컬러 카드로 fallback

## 운영/호환성 개선

- `ELEVENLABS_VOICE_ID` env 지원
  무료 플랜에서 Voice Library 음성 제한을 피하기 위해
  Default voice ID를 지정해서 테스트 가능하도록 변경

- ElevenLabs 기본 speed를 `1.2`로 조정
  허용 범위 초과로 인한 `invalid_voice_settings` 오류 대응

- ffmpeg subtitle filter fallback 추가
  로컬 ffmpeg 빌드에 `ass` 또는 `subtitles` 필터가 없을 때
  자막 없이 final video를 생성하도록 대응

## 문서화

- `README.md`를 프로젝트 기준으로 재작성
- `CLAUDE.md`, `CODEX.md` 보강
- `docs/` 폴더 추가
- `architecture.md`, `integrations-and-costs.md`, `operations.md` 작성
- `TODO.md` 추가

## 확인된 운영 이슈

- ChatGPT 웹 구독과 OpenAI API billing은 별도
- ElevenLabs 무료 플랜은 일부 voice library 음성을 API에서 사용할 수 없음
- 현재 로컬 ffmpeg 빌드는 subtitle filter가 비활성화되어 있을 수 있음
- 현재 ffmpeg 빌드에는 `drawtext` 필터가 없을 수 있으므로 영상 안 텍스트 카드는 별도 이미지/컬러 카드 fallback이 필요

## 현재 상태 메모

- `hook / intro / item / cta` 오디오와 슬라이드 싱크는 맞춰진 상태
- 진행 상태 polling은 `이력 상세`에서 active job일 때만 수행
- 홈 화면은 단순 입력/후보 선택 중심이고, 진행 추적은 상세 페이지에서 처리
- intro 이미지는 자동 검색 fallback까지 들어갔지만, 템플릿형 타이틀 디자인은 아직 미구현

## 다음 후보 작업

- intro 템플릿 카드 몇 종 추가 및 텍스트 커스터마이즈
- 중간 산출물 캐시/재사용 고도화
- `recompose` 전용 API 분리
- subtitle 번인을 위한 `libass` 포함 ffmpeg 대응
