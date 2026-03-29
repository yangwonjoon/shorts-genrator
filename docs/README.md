# Docs

이 폴더는 `shorts-generator`의 기술 문서를 정리한 공간입니다.

## 문서 목록

- `architecture.md`
  앱 구조, 생성 플로우, 주요 파일, DB/파일 저장 구조

- `integrations-and-costs.md`
  Claude/OpenAI, ElevenLabs, Pexels, FFmpeg 사용 방식과 비용/플랜 메모

- `operations.md`
  실제 운영/테스트 방법, `.env.local` 예시, 자주 겪는 문제와 대응 방식

## 현재 추천 사용 흐름

현재 가장 안정적인 사용 흐름은 아래입니다.

1. ChatGPT 또는 Claude 웹에서 스크립트 JSON 생성
2. 앱의 `스크립트 붙여넣기` 탭에 JSON 입력
3. ElevenLabs로 음성 생성
4. Pexels로 배경 영상 검색
5. FFmpeg로 최종 영상 합성

이 방식은 AI API quota 이슈를 피하면서, 이 프로젝트를 `쇼츠 렌더러`처럼 사용할 수 있다는 장점이 있습니다.
