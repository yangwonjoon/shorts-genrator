export const APP_NAME = 'Shorts Generator';

export const VIDEO = {
  WIDTH: 1080,
  HEIGHT: 1920,
  FPS: 30,
  FORMAT: '9:16' as const,
} as const;

export const TIMING = {
  HOOK_DURATION: 3,
  INTRO_DURATION: 4,
  ITEM_DURATION: 5,
  CTA_DURATION: 3,
} as const;

export const EXAMPLE_TOPICS = [
  '세계에서 가장 비싼 자동차',
  '죽기 전에 가봐야 할 여행지',
  '2026년 최고의 AI 도구',
  '역대 가장 무서운 영화',
  '한국에서 가장 아름다운 곳',
] as const;

export const STEPS = [
  { id: 'script', label: '스크립트 생성' },
  { id: 'tts', label: '음성 생성' },
  { id: 'background', label: '배경 영상 수집' },
  { id: 'compose', label: '영상 합성' },
] as const;

export const OUTPUT_DIR = process.env.OUTPUT_DIR || './output';
