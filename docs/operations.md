# Operations

## 권장 사용 방식

현재 가장 운영하기 쉬운 방식은 아래입니다.

1. ChatGPT 또는 Claude 웹에서 스크립트 JSON 생성
2. 앱의 `스크립트 붙여넣기` 탭에서 프롬프트 복사
3. AI 웹앱에 붙여넣어 JSON 생성
4. JSON을 앱에 다시 붙여넣기
5. item별 대표 이미지 후보를 확인하고 필요하면 재검색
6. TTS, 이미지 슬라이드, 합성만 수행

이 방식은 OpenAI/Anthropic API quota 문제를 줄이고, 스크립트 품질을 사람이 직접 검수할 수 있다는 장점이 있습니다.

## `.env.local` 예시

```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=your_anthropic_api_key

TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_default_voice_id

VIDEO_PROVIDER=pexels
PEXELS_API_KEY=your_pexels_api_key

OUTPUT_DIR=./output
```

OpenAI를 쓸 경우:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5
```

## 서버 실행

```bash
npm install
npm run dev
```

브라우저:

```text
http://localhost:3000
```

## 수동 스크립트 렌더링 방법

1. 홈에서 `스크립트 붙여넣기` 탭 선택
2. `프롬프트 복사` 버튼 클릭
3. ChatGPT 또는 Claude 웹에 프롬프트 전달
4. AI가 반환한 JSON만 복사
5. 아래 텍스트 영역에 붙여넣기
6. item별 대표 이미지 후보를 확인하고 선택
7. `생성` 실행

## 이력 상세 사용법

1. 생성 시작 후 이력 상세 페이지로 이동
2. 진행 중이면 상태/진행률/로그 확인
3. 멈춘 작업이면 `이어 시도`
4. 실패한 작업이면 `재시도`
5. 필요하면 `로그 복사`로 에러 공유

참고:

- polling은 `진행 중(active)` 작업일 때만 이력 상세에서 수행
- 완료/실패 상태가 되면 자동으로 멈춤

## 대본만 테스트하고 싶을 때

`/api/script`만 호출하면 됩니다.

예시:

```bash
curl -X POST http://localhost:3000/api/script \
  -H "Content-Type: application/json" \
  -d '{"topic":"세계에서 가장 비싼 자동차","language":"ko","itemCount":10}'
```

## 자주 겪는 문제

### 1. `ANTHROPIC_API_KEY is not set`

원인:

- `AI_PROVIDER` 값이 잘못됨
- 예: `AI_PROVIDER=gpt-5`

해결:

```bash
AI_PROVIDER=openai
OPENAI_MODEL=gpt-5
```

또는

```bash
AI_PROVIDER=claude
```

## 2. OpenAI quota 오류

예:

```text
You exceeded your current quota
```

원인:

- ChatGPT 구독과 API billing은 별도
- API billing/payment method가 없을 수 있음
- API organization/project가 다를 수 있음

대응:

- `platform.openai.com`의 billing/usage/limits 확인
- 또는 웹 ChatGPT로 스크립트를 직접 만들고 앱에는 JSON만 입력

## 3. ElevenLabs `paid_plan_required`

예:

```text
Free users cannot use library voices via the API
```

원인:

- 무료 플랜에서 Voice Library 음성을 API로 사용

대응:

- `ELEVENLABS_VOICE_ID`에 계정에서 사용 가능한 Default voice ID 입력

## 4. Final compose 실패

예:

```text
Final compose failed: ffmpeg exited with code 234
```

원인 후보:

- subtitle 필터 경로 문제
- 로컬 ffmpeg 빌드에 `ass` / `subtitles` 필터 없음

현재 코드 대응:

- 자막 필터가 있으면 자막 포함 합성
- 없으면 자막 없이 final video 생성

## 5. `drawtext` 필터 없음

예:

```text
No such filter: 'drawtext'
```

원인:

- 현재 로컬 ffmpeg 빌드에 `drawtext`가 포함되지 않음

현재 코드 대응:

- intro/hook/cta는 텍스트를 ffmpeg에 직접 그리지 않음
- intro 대표 이미지를 먼저 찾고, 없으면 텍스트 없는 안전한 컬러 카드로 fallback

## 6. 싱크가 맞지 않음

과거 원인:

- 전체 TTS 1개
- 화면/자막은 고정 duration

현재 코드 대응:

- `hook / intro / 각 item / cta`를 개별 TTS로 생성
- 실제 mp3 길이를 읽어서 슬라이드와 자막 타이밍에 반영

## 운영상 주의점

- 멈춘 작업은 이력 상세의 `이어 시도`로 이어갈 수 있음
- 실패한 작업은 이력 상세의 `재시도`로 다시 실행 가능
- 다만 완전한 단계별 cache/skip 구조는 아직 아니므로 일부 단계는 다시 돌 수 있음

## 향후 개선 예정 메모

- intro 템플릿 카드 추가
- 중간 산출물 재사용 고도화
- `recompose` 전용 API
- 단계별 cache/skip 정책
