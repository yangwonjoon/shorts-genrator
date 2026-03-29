'use client';

import { useState } from 'react';

interface ScriptJsonInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

const AI_PROMPT_TEMPLATE = `당신은 유튜브 숏폼 전문 스크립트 작가입니다.
아래 주제로 Top 10 숏폼 스크립트를 작성해주세요.

## 주제
[여기에 주제를 입력하세요]

## 규칙
- 언어: 한국어
- 항목 수: 10개 (10위 -> 1위 순서)
- 각 항목의 description은 TTS로 읽었을 때 5~6초 분량
- hook은 시청자 관심을 끄는 강렬한 한 문장
- intro는 주제를 소개하는 문장
- cta는 구독과 좋아요를 요청하는 문장
- searchQuery는 해당 항목의 배경 영상을 검색할 영문 키워드
- 각 항목의 duration은 5 또는 6
- metadata의 title, description, tags는 YouTube 업로드 정보

## 출력 형식
아래 JSON 형식으로만 응답하세요. 설명 문장, 코드펜스, 마크다운은 절대 포함하지 마세요.

{
  "hook": "시청자 관심을 끄는 문장",
  "intro": "오늘은 [주제] Top 10을 알려드립니다",
  "items": [
    {
      "rank": 10,
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

JSON만 출력하세요.`;

export function ScriptJsonInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: ScriptJsonInputProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-4 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-white">AI용 프롬프트</p>
            <p className="text-xs text-zinc-500 mt-1">
              아래 프롬프트를 ChatGPT나 Claude에 붙여넣고, 받은 JSON을 아래 입력창에 넣으세요.
            </p>
          </div>
          <button
            onClick={handleCopyPrompt}
            type="button"
            className="px-4 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors shrink-0"
          >
            {copied ? '복사됨' : '프롬프트 복사'}
          </button>
        </div>
        <textarea
          value={AI_PROMPT_TEMPLATE}
          readOnly
          spellCheck={false}
          className="w-full min-h-72 px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-sm font-mono focus:outline-none"
        />
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="AI가 반환한 JSON 결과를 여기에 붙여넣으세요."
        disabled={disabled}
        spellCheck={false}
        className="w-full min-h-80 px-5 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 text-sm font-mono placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition-all"
      />
      <div className="flex items-center justify-between mt-3 gap-3">
        <p className="text-xs text-zinc-500">
          AI 응답이 JSON만 포함하는지 확인한 뒤 그대로 붙여넣으세요.
        </p>
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
        >
          {disabled ? '생성 중...' : '스크립트로 생성'}
        </button>
      </div>
    </div>
  );
}
