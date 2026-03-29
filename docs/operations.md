# Operations

## 권장 사용 방식

현재 가장 운영하기 쉬운 방식은 아래입니다.

1. ChatGPT 또는 Claude 웹에서 스크립트 JSON 생성
2. 앱의 `스크립트 붙여넣기` 탭에서 프롬프트 복사
3. AI 웹앱에 붙여넣어 JSON 생성
4. JSON을 앱에 다시 붙여넣기
5. TTS, 배경 영상, 합성만 수행

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
6. `스크립트로 생성` 실행

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

## 운영상 주의점

- 현재는 중간 단계 실패 후 재사용 기능이 없음
- 그래서 `TTS`까지 성공한 뒤 마지막에 실패하면 비용이 다시 들 수 있음
- 이 개선 아이템은 `TODO.md`에 정리되어 있음

## 향후 개선 예정 메모

- `recompose` 전용 API
- 중간 산출물 재사용
- 실패 job 재시도 UI
- 단계별 cache/skip 정책
