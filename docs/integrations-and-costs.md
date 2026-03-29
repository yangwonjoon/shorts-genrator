# Integrations And Costs

이 문서는 현재 프로젝트가 어떤 외부 서비스를 어떻게 쓰는지, 비용/플랜이 어떻게 연결되는지 정리합니다.

## 1. Anthropic Claude

### 현재 역할

- `주제로 생성` 모드에서 스크립트 JSON 생성

### 코드 위치

- `src/lib/providers/claude.provider.ts`
- `src/lib/prompts/top10.ts`

### 사용 방식

- Anthropic SDK를 사용해 prompt를 보내고
- 응답에서 JSON 블록을 정규식으로 추출해서 파싱

### 주의점

- 응답 형식이 JSON에서 벗어나면 파싱 실패 가능
- 현재는 Structured Output이 아니라 텍스트 응답 기반 파싱

## 2. OpenAI

### 현재 역할

- 선택적 AI provider
- `AI_PROVIDER=openai`일 때 스크립트 JSON 생성

### 코드 위치

- `src/lib/providers/openai.provider.ts`

### 사용 방식

- OpenAI `Responses API` 사용
- `text.format.type = json_schema` 형태의 Structured Outputs 사용

### billing 메모

- ChatGPT 웹 구독과 API billing은 별도
- ChatGPT Plus/Pro/Max를 사용해도 API 비용이 자동 포함되지 않음

### 현재 프로젝트에서의 실전 권장안

- OpenAI API quota나 billing 문제를 피하고 싶다면
- ChatGPT 웹에서 직접 스크립트를 만든 뒤
- 앱의 `스크립트 붙여넣기` 모드로 렌더링만 수행하는 흐름이 더 안정적

### 참고 링크

- OpenAI Help: ChatGPT subscription과 API는 별도
  https://help.openai.com/en/articles/8156019

- OpenAI Help: ChatGPT billing과 API platform billing은 분리
  https://help.openai.com/en/articles/9039756-billing-settings-in-chatgpt-vs-platform

## 3. ElevenLabs TTS

### 현재 역할

- 완성된 스크립트를 하나의 내레이션 mp3로 변환

### 코드 위치

- `src/lib/providers/elevenlabs.provider.ts`

### 사용 방식

- `text-to-speech/<voiceId>` 엔드포인트 호출
- 현재 코드 기본 모델은 `eleven_multilingual_v2`
- `ELEVENLABS_VOICE_ID`를 지정하면 그 음성을 우선 사용

### 무료 사용 가능 여부

- 가능
- API는 무료 플랜에도 포함되지만, 실제 생성량만큼 credits를 차감

### 비용 메모

- API 자체에 추가 요금이 붙는 방식이 아니라 생성 크레딧 차감 방식
- `Multilingual v2`는 self-serve 기준 `1 text character = 1 credit`
- Free 플랜은 `10k credits/month`

### 쇼츠 1개당 대략 사용량

이 프로젝트의 `Top 10` 스크립트는 보통 `600~1,000자` 정도가 나옵니다.

대략 추정:

- `600자` 스크립트 -> 약 `600 credits`
- `800자` 스크립트 -> 약 `800 credits`
- `1,000자` 스크립트 -> 약 `1,000 credits`

Free 플랜 `10,000 credits` 기준 예상 개수:

- 약 `10~16개/월`

이 수치는 스크립트 길이에 따라 달라집니다.

### 무료 플랜에서 자주 겪는 문제

- Voice Library 음성은 무료 API에서 막힐 수 있음
- `paid_plan_required`가 뜨면 `Default voice`의 `Voice ID`를 써야 할 가능성이 높음

### 현재 코드 대응

- `ELEVENLABS_VOICE_ID` env를 지원
- 무료 플랜 테스트 시 계정에서 사용 가능한 `Default voice` ID를 넣는 것을 권장

### 참고 링크

- ElevenLabs Help: API는 모든 플랜에 포함
  https://help.elevenlabs.io/hc/en-us/articles/28184926326033-How-much-does-it-cost-to-use-the-API

- ElevenLabs Help: credits 설명
  https://help.elevenlabs.io/hc/en-us/articles/27562020846481-What-are-credits

- ElevenLabs Pricing
  https://elevenlabs.io/pricing

- ElevenLabs API Pricing
  https://elevenlabs.io/pricing/api

## 4. Pexels

### 현재 역할

- 각 순위 항목의 `searchQuery`로 세로형 배경 영상 검색
- 다운로드한 클립을 FFmpeg로 이어 붙이는 방식

### 코드 위치

- `src/lib/providers/pexels.provider.ts`

### 무료 사용 가능 여부

- 가능
- 현재 공식 도움말 기준 완전 무료

### 기본 제한

- `200 requests/hour`
- `20,000 requests/month`

### 주의점

- 앱의 핵심 기능이 단순한 wallpaper/gallery 복제이면 Pexels 정책과 충돌 가능
- 이 프로젝트처럼 다른 기능을 가진 앱에 미디어 검색 기능을 넣는 형태가 더 안전함

### 참고 링크

- Pexels Help: API는 무료
  https://help.pexels.com/hc/en-us/articles/47677890260761-Is-the-Pexels-API-free-to-use

- Pexels Help: API 소개
  https://help.pexels.com/hc/en-us/articles/360042327714-Does-Pexels-offer-an-API

- Pexels Help: 무제한 요청 조건
  https://help.pexels.com/hc/en-us/articles/900005852323-How-do-I-get-unlimited-requests

## 5. FFmpeg

### 현재 역할

- 배경 영상 concat
- 오디오와 배경 영상 합성
- subtitle overlay 시도

### 무료 사용 가능 여부

- 가능
- 오픈소스

### 라이선스 메모

- FFmpeg는 기본적으로 LGPL 계열
- 일부 옵션/빌드 조합에 따라 GPL 조건이 적용될 수 있음

### 현재 코드 주의점

- 일부 로컬 ffmpeg 빌드에는 `ass` 또는 `subtitles` 필터가 없음
- 현재 코드는 필터가 있으면 자막 번인
- 필터가 없으면 자막 없이 final video를 생성하도록 fallback

### 참고 링크

- FFmpeg license
  https://www.ffmpeg.org/legal.html
