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

## 운영/호환성 개선

- `ELEVENLABS_VOICE_ID` env 지원
  무료 플랜에서 Voice Library 음성 제한을 피하기 위해
  Default voice ID를 지정해서 테스트 가능하도록 변경

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
- 중간 실패 후 `audio/background/subtitle` 재사용 기능은 아직 없음

## 다음 후보 작업

- `recompose` API 추가
- 실패한 job 재시도 UI
- 중간 산출물 캐시/재사용
- subtitle 번인을 위한 `libass` 포함 ffmpeg 대응
