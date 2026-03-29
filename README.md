# Shorts Generator

주제를 입력하면 `Top 10` 형식의 유튜브 쇼츠 영상을 자동으로 생성하는 `Next.js` 프로젝트입니다.

현재 파이프라인은 아래 4단계로 구성되어 있습니다.

1. Claude로 쇼츠 스크립트 생성
2. ElevenLabs로 전체 내레이션 음성 생성
3. Pexels에서 세로형 배경 영상 검색 및 다운로드
4. FFmpeg로 배경 영상, 오디오, 자막을 합성해 최종 mp4 생성

## Stack

- `Next.js 16` / `React 19`
- `TypeScript`
- `better-sqlite3` + `drizzle-orm`
- `Anthropic SDK`
- `fluent-ffmpeg`

## Features

- 주제 기반 `Top 10` 쇼츠 스크립트 자동 생성
- 생성 진행 UI
- 생성 이력 조회
- 최종 영상 다운로드
- Provider 기반 구조로 AI/TTS/배경 영상 서비스 교체 가능

## Environment Variables

`.env.local` 파일에 아래 값을 설정합니다.

```bash
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
PEXELS_API_KEY=...

# optional
AI_PROVIDER=claude
TTS_PROVIDER=elevenlabs
VIDEO_PROVIDER=pexels
OUTPUT_DIR=./output
```

## Getting Started

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 됩니다.

## Requirements

- `Node.js 20+` 권장
- 시스템에 `ffmpeg` / `ffprobe` 설치 필요

macOS:

```bash
brew install ffmpeg
```

## Generation Flow

현재 실제 생성은 프론트에서 `/api/generate` 한 번을 호출하고, 서버가 모든 단계를 순차 처리하는 구조입니다.

```text
HomePage
  -> POST /api/generate
    -> DB record 생성
    -> ClaudeProvider.generateScript()
    -> ElevenLabsProvider.synthesize()
    -> PexelsProvider.search()/download()
    -> buildSubtitleEntries()
    -> generateAssSubtitle()
    -> concatVideos()
    -> composeFinal()
    -> DB status = done
    -> /api/video/serve?id=...
```

### Step By Step

1. 사용자가 홈 화면에서 주제를 입력합니다.
2. `src/app/page.tsx`가 `/api/generate`를 호출합니다.
3. `src/app/api/generate/route.ts`가 `shorts` 테이블에 작업 레코드를 생성합니다.
4. AI provider가 `hook`, `intro`, `items`, `cta`, `metadata`를 포함한 JSON 스크립트를 만듭니다.
5. TTS provider가 스크립트 전체를 하나의 오디오로 합성합니다.
6. 각 항목의 `searchQuery`로 Pexels 배경 영상을 찾고 다운로드합니다.
7. FFmpeg가 배경 영상을 이어 붙이고, ASS 자막과 오디오를 합성합니다.
8. 최종 mp4 경로를 DB에 저장하고 `/api/video/serve`로 제공합니다.

## Project Structure

```text
src/
  app/
    api/
      generate/          # 전체 생성 오케스트레이션
      script/            # 스크립트만 생성
      tts/               # 음성만 생성
      video/
        background/      # 배경 영상 검색
        compose/         # 영상 합성
        serve/           # 최종 mp4 제공
    history/             # 생성 이력 화면
    settings/            # API 키/환경 안내 화면
  components/            # UI 컴포넌트
  config/                # 상수, timing, step 정의
  lib/
    db/                  # SQLite + Drizzle
    prompts/             # Claude 프롬프트
    providers/           # AI/TTS/Video provider
    video/               # FFmpeg, subtitle 유틸
  types/                 # 공용 타입
```

## Important Files

- `src/app/page.tsx`
  프론트 메인 화면과 생성 요청 시작점
- `src/app/api/generate/route.ts`
  전체 생성 플로우의 핵심 오케스트레이터
- `src/lib/providers/claude.provider.ts`
  Claude 기반 스크립트 생성
- `src/lib/providers/elevenlabs.provider.ts`
  TTS 합성
- `src/lib/providers/pexels.provider.ts`
  배경 영상 검색/다운로드
- `src/lib/video/ffmpeg.ts`
  배경 영상 concat 및 최종 합성
- `src/lib/video/subtitle.ts`
  ASS 자막 생성

## Database

SQLite 파일 `shorts.db`에 생성 작업 상태를 저장합니다.

주요 컬럼:

- `id`
- `topic`
- `status`
- `script`
- `audioPath`
- `videoPath`
- `finalPath`
- `error`
- `createdAt`
- `updatedAt`

## Provider Notes

- `AI_PROVIDER=openai`는 현재 인터페이스만 있고 실제 구현은 비어 있습니다.
- 기본 AI provider는 `claude`입니다.
- 기본 TTS provider는 `elevenlabs`입니다.
- 기본 영상 provider는 `pexels`입니다.

## Current Limitations

- 진행 상태 UI는 실시간 polling 없이 단순 단계 표시입니다.
- 자막 타이밍은 실제 음성 구간 정렬이 아니라 고정 duration 기반입니다.
- Claude 응답은 JSON 정규식 추출로 파싱합니다.
- 생성 작업은 백그라운드 큐 없이 요청 한 번에서 끝까지 동기 실행됩니다.

## Agent Files

- `AGENTS.md`
  공통 에이전트 작업 규칙
- `CLAUDE.md`
  Claude용 프로젝트 진입 문서
- `CODEX.md`
  Codex용 프로젝트 진입 문서
