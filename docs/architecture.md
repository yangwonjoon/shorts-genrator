# Architecture

## 프로젝트 목적

이 프로젝트는 `Top 10` 형식의 유튜브 쇼츠 영상을 자동 생성하는 `Next.js` 앱입니다.

현재는 두 가지 생성 모드를 지원합니다.

1. `주제로 생성`
   주제를 입력하면 AI provider가 스크립트를 만들고, 이후 TTS/영상 합성까지 진행

2. `스크립트 붙여넣기`
   외부에서 만든 스크립트 JSON을 붙여넣고, 후보 이미지 선택 후 AI 단계 없이 TTS/영상 합성만 진행

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
    -> 세그먼트별 TTS 생성
    -> Pexels 대표 이미지 수집
    -> intro 대표 이미지 검색
    -> subtitle.ass 생성 (세그먼트 실제 길이 기준)
    -> background.mp4 생성
    -> final mp4 합성
```

### 2. 스크립트 붙여넣기

```text
HomePage
  -> POST /api/generate-from-script
    -> Script JSON validation
    -> DB job 생성
    -> Pexels 후보 이미지 조회 / 선택
    -> 세그먼트별 TTS 생성
    -> Pexels 대표 이미지 수집
    -> subtitle.ass 생성 (세그먼트 실제 길이 기준)
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
  HTTP Range 부분 응답 지원으로 seek 가능

- `src/app/api/generate/action/route.ts`
  실패 작업 `retry`, 멈춘 작업 `resume` 처리

## 주요 UI 파일

- `src/app/page.tsx`
  홈 화면. `주제로 생성 / 스크립트 붙여넣기` 모드 전환과 후보 선택 흐름 포함

- `src/components/topic-input.tsx`
  주제 입력 UI

- `src/components/script-json-input.tsx`
  AI용 프롬프트 복사 + JSON 붙여넣기 UI

- `src/components/video-candidate-selector.tsx`
  item별 대표 이미지 후보 선택 / 재검색 UI

- `src/components/generation-progress.tsx`
  단계 표시 UI

- `src/components/video-player.tsx`
  결과 영상 표시

- `src/components/script-preview.tsx`
  생성된 스크립트 미리보기 + JSON 복사

- `src/app/history/[id]/page.tsx`
  이력 상세. 진행률, 진행 로그, 재시도/이어 시도, 결과 영상 확인

## 핵심 서버 로직

- `src/lib/generation/pipeline.ts`
  세그먼트별 TTS, 대표 이미지 수집, subtitle, final compose 공통 파이프라인

- `src/lib/script/validation.ts`
  수동 입력 JSON 검증

- `src/lib/video/ffmpeg.ts`
  이미지 슬라이드 compose, audio concat, final compose, duration 추출

- `src/lib/video/subtitle.ts`
  세그먼트 길이 기반 subtitle entry 생성 및 ASS 파일 생성

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
  Pexels photo 검색/다운로드

## DB 구조

SQLite 파일은 프로젝트 루트의 `shorts.db`입니다.

테이블: `shorts`

컬럼:

- `id`
  job ID

- `topic`
  사용자가 넣은 주제 또는 스크립트 제목

- `status`
  `pending | scripting | tts | background | composing | done | failed`

- `progressStep`
  현재 단계 식별자

- `progressMessage`
  현재 단계 설명

- `progressLog`
  이력 상세에 표시되는 단계 로그

- `progressCurrent`, `progressTotal`
  진행률 표시용 값

- `inputMode`
  `topic | script`

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
    <jobId>/
      00-hook.mp3
      01-intro.mp3
      ...
  video/
    <jobId>/
      intro.jpg
      clip_0.jpg
      clip_1.jpg
      ...
      background.mp4
      subtitle.ass
  final/
    <jobId>.mp4
```

## 현재 제약 사항

- intro/hook/cta는 아직 템플릿 디자인이 아니라 자동 검색 이미지 또는 fallback 카드 중심
- 중간 산출물 재사용은 일부 지원되지만 완전한 단계별 cache/skip 구조는 아님
- 현재 환경의 ffmpeg 빌드에 따라 자막 번인이 비활성화될 수 있음
- 현재 환경의 ffmpeg 빌드에 `drawtext`가 없으면 텍스트 카드 연출은 제한됨
