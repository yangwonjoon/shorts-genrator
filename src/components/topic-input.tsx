'use client';

import { EXAMPLE_TOPICS } from '@/config/constants';

interface TopicInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function TopicInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: TopicInputProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && value.trim()) onSubmit();
          }}
          placeholder="주제를 입력하세요 (예: 세계에서 가장 비싼 자동차)"
          disabled={disabled}
          className="flex-1 px-5 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-lg placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition-all"
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="px-8 py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-colors shrink-0"
        >
          {disabled ? '생성 중...' : '생성'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {EXAMPLE_TOPICS.map((topic) => (
          <button
            key={topic}
            onClick={() => onChange(topic)}
            disabled={disabled}
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full border border-zinc-700 transition-colors disabled:opacity-50"
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
