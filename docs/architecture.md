# Architecture

## 프로젝트 목적

이 프로젝트는 `Top 10` 형식의 유튜브 쇼츠 영상을 자동 생성하는 `Next.js` 앱입니다.

현재는 두 가지 생성 모드를 지원합니다.

1. `주제로 생성`
   주제를 입력하면 AI provider가 스크립트를 만들고, 이후 TTS/영상 합성까지 진행

2. `스크립트 붙여넣기`
   외부에서 만든 스크립트 JSON을 붙여넣고, AI 단계 없이 TTS/영상 합성만 진행

## 기술 스택

- `Next.js 16`
- `React 19`
- `TypeScript`
- `better-sqlite3`
- `drizzle-orm`
- `fluent-ffmpeg`

## 전체 생성 플로우

### 1. 주제로 생성

```text
HomePage
  -> POST /api/generate
    -> DB job 생성
    -> AI provider로 스크립트 생성
    -> TTS 생성
    -> Pexels 배경 영상 수집
    -> subtitle.ass 생성
    -> background.mp4 생성
    -> final mp4 합성
```

### 2. 스크립트 붙여넣기

```text
HomePage
  -> POST /api/generate-from-script
    -> Script JSON validation
    -> DB job 생성
    -> TTS 생성
    -> Pexels 배경 영상 수집
    -> subtitle.ass 생성
    -> background.mp4 생성
    -> final mp4 합성
```

## 주요 엔드포인트

- `src/app/api/generate/route.ts`
  전체 오케스트레이션. `topic -> script -> tts -> video -> compose`

- `src/app/api/generate-from-script/route.ts`
  수동 스크립트 렌더링용. `script -> tts -> video -> compose`

- `src/app/api/script/route.ts`
  스크립트만 생성

- `src/app/api/tts/route.ts`
  TTS만 생성

- `src/app/api/video/background/route.ts`
  배경 영상 검색

- `src/app/api/video/compose/route.ts`
  클립/오디오/자막으로 최종 영상 합성

- `src/app/api/video/serve/route.ts`
  DB에 저장된 `finalPath`를 읽어 mp4 제공

## 주요 UI 파일

- `src/app/page.tsx`
  홈 화면. `주제로 생성 / 스크립트 붙여넣기` 모드 전환 포함

- `src/components/topic-input.tsx`
  주제 입력 UI

- `src/components/script-json-input.tsx`
  AI용 프롬프트 복사 + JSON 붙여넣기 UI

- `src/components/generation-progress.tsx`
  단계 표시 UI

- `src/components/video-player.tsx`
  결과 영상 표시

- `src/components/script-preview.tsx`
  생성된 스크립트 미리보기

## 핵심 서버 로직

- `src/lib/generation/pipeline.ts`
  TTS, 배경 영상, subtitle, final compose 공통 파이프라인

- `src/lib/script/validation.ts`
  수동 입력 JSON 검증

- `src/lib/video/ffmpeg.ts`
  concat, compose, duration 추출

- `src/lib/video/subtitle.ts`
  subtitle entry 생성 및 ASS 파일 생성

## Provider 구조

### AI

- `src/lib/providers/claude.provider.ts`
  Anthropic Claude로 스크립트 생성

- `src/lib/providers/openai.provider.ts`
  OpenAI Responses API + Structured Outputs로 스크립트 생성

### TTS

- `src/lib/providers/elevenlabs.provider.ts`
  ElevenLabs TTS 사용

### Video

- `src/lib/providers/pexels.provider.ts`
  Pexels 비디오 검색/다운로드

## DB 구조

SQLite 파일은 프로젝트 루트의 `shorts.db`입니다.

테이블: `shorts`

컬럼:

- `id`
  job ID

- `topic`
  사용자가 넣은 주제 또는 스크립트 제목

- `status`
  `pending | scripting | tts | composing | done | failed`

- `script`
  생성된 스크립트 JSON 문자열

- `audioPath`
  생성된 mp3 경로

- `videoPath`
  합쳐진 배경 영상 경로

- `finalPath`
  최종 mp4 경로

- `error`
  실패 사유

- `createdAt`, `updatedAt`
  생성/수정 시각

## 파일 출력 구조

기본 출력 디렉터리:

```text
output/
  audio/
    <jobId>.mp3
  video/
    <jobId>/
      clip_0.mp4
      clip_1.mp4
      ...
      background.mp4
      subtitle.ass
  final/
    <jobId>.mp4
```

## 현재 제약 사항

- 진행 상태 UI는 실시간 polling이 아니라 단순 단계 표시
- subtitle 타이밍은 실제 TTS segment alignment가 아니라 고정 duration 기반
- 중간 산출물 재사용이 아직 없음
- 실패 후 `compose만 재시도` 기능이 아직 없음
- 현재 환경의 ffmpeg 빌드에 따라 자막 번인이 비활성화될 수 있음
