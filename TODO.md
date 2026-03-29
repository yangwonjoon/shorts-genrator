# TODO

## High Priority

- 중간 산출물 재사용 지원
  실패 후 다시 생성할 때 이미 만든 `audio`, `clip`, `background.mp4`, `subtitle.ass`를 재사용해서 API 비용과 시간을 줄이기

- `recompose` 전용 API 추가
  `jobId` 기준으로 기존 `audioPath`, `videoPath`, `script`를 읽어서 마지막 합성 단계만 다시 실행할 수 있게 만들기

- 실패 작업 재시도 UI 추가
  이력 화면이나 결과 화면에서 `마지막 단계 다시 시도` 버튼을 제공해서 TTS와 영상 다운로드를 다시 하지 않도록 만들기

## Nice To Have

- 단계별 캐시 정책 정리
  어떤 파일이 있으면 어떤 단계를 건너뛸지 명확히 정의하기

- 실패 원인별 복구 전략 추가
  `TTS 실패`, `배경 영상 없음`, `FFmpeg 합성 실패`를 구분해서 적절한 재시도 흐름 제공
