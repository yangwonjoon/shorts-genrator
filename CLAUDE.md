@AGENTS.md

# Claude Notes

## Project Summary

이 프로젝트는 주제 입력만으로 `Top 10` 쇼츠 영상을 생성하는 자동화 앱입니다.

현재 생성 파이프라인:

1. 스크립트 생성
2. TTS 생성
3. 배경 영상 수집
4. 자막/영상 합성

## Main Files

- `src/app/page.tsx`
- `src/app/api/generate/route.ts`
- `src/lib/prompts/top10.ts`
- `src/lib/providers/claude.provider.ts`
- `src/lib/providers/elevenlabs.provider.ts`
- `src/lib/providers/pexels.provider.ts`
- `src/lib/video/ffmpeg.ts`
- `src/lib/video/subtitle.ts`

## Implementation Notes

- 메인 UI는 `/api/generate`만 호출합니다.
- 스크립트 출력 포맷은 JSON이어야 합니다.
- 각 item에는 `searchQuery`와 `duration`이 포함되어야 합니다.
- 배경 영상은 세로형 `portrait` 기준으로 검색합니다.
- 생성 이력은 SQLite에 저장합니다.

## Required Keys

- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`
- `PEXELS_API_KEY`
