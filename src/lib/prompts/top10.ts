import type { ScriptRequest } from '@/types';

export function buildTop10Prompt(request: ScriptRequest): string {
  const { topic, language = 'ko', itemCount = 10 } = request;

  return `당신은 유튜브 숏폼 전문 스크립트 작가입니다.
아래 주제로 Top ${itemCount} 숏폼 스크립트를 작성해주세요.

## 주제
${topic}

## 규칙
- 언어: ${language === 'ko' ? '한국어' : language}
- 항목 수: ${itemCount}개 (${itemCount}위 → 1위 순서)
- 각 항목의 description은 TTS로 읽었을 때 5~6초 분량 (2~3문장)
- hook은 시청자 관심을 끄는 강렬한 한 문장 (3초 분량)
- intro는 주제를 소개하는 문장 (4초 분량)
- cta는 구독과 좋아요를 요청하는 문장 (3초 분량)
- searchQuery는 해당 항목의 배경 영상을 검색할 영문 키워드 (Pexels 검색용)
- 각 항목의 duration은 5~6초
- metadata의 title, description, tags는 YouTube에 올릴 정보

## 출력 형식 (반드시 이 JSON 형식으로만 응답)
{
  "hook": "시청자 관심을 끄는 문장",
  "intro": "오늘은 [주제] Top ${itemCount}을 알려드립니다",
  "items": [
    {
      "rank": ${itemCount},
      "title": "항목 이름",
      "description": "TTS로 읽을 내용 2~3문장",
      "searchQuery": "english search keywords",
      "duration": 5
    }
  ],
  "cta": "구독과 좋아요 부탁드립니다",
  "metadata": {
    "title": "YouTube 영상 제목",
    "description": "YouTube 영상 설명",
    "tags": ["태그1", "태그2"]
  }
}

JSON만 출력하세요. 다른 텍스트는 포함하지 마세요.`;
}
