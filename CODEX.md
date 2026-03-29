@AGENTS.md

# Codex Notes

## Project Summary

이 저장소는 주제를 입력하면 `Top 10` 형식의 유튜브 쇼츠 영상을 자동 생성하는 `Next.js` 앱입니다.

핵심 흐름:

1. `Claude`가 스크립트 생성
2. `ElevenLabs`가 음성 생성
3. `Pexels`가 배경 영상 제공
4. `FFmpeg`가 최종 영상 합성

## Main Entry Points

- `src/app/page.tsx`
- `src/app/api/generate/route.ts`
- `src/lib/providers/*`
- `src/lib/video/*`

## Working Notes

- 실제 메인 파이프라인은 `/api/generate` 하나가 순차 처리합니다.
- `script`, `tts`, `video/background`, `video/compose` API는 분리 실험용 또는 보조 엔드포인트 성격입니다.
- DB는 루트의 `shorts.db` SQLite 파일을 사용합니다.
- 결과물은 기본적으로 `./output` 아래에 저장됩니다.
- `AI_PROVIDER=openai`는 아직 구현되지 않았습니다.

## Environment

필수 키:

- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`
- `PEXELS_API_KEY`

## Cautions

- `ffmpeg`와 `ffprobe`가 시스템에 설치되어 있어야 합니다.
- 자막 타이밍은 고정 duration 기반이라 오디오와 완벽히 일치하지 않을 수 있습니다.
- Claude 응답은 JSON 추출 방식으로 파싱하므로 출력 포맷 안정성이 중요합니다.
