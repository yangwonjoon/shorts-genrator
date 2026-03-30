'use client';

import { useState } from 'react';
import type { ScriptResult } from '@/types';

interface ScriptPreviewProps {
  script: ScriptResult;
}

export function ScriptPreview({ script }: ScriptPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(script, null, 2)
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <span
            className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          스크립트 보기
        </button>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-white rounded-md transition-colors"
        >
          {copied ? '복사됨' : 'JSON 복사'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 p-5 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-4 text-sm">
          {/* Hook */}
          <div>
            <span className="text-violet-400 font-semibold text-xs uppercase tracking-wide">
              Hook
            </span>
            <p className="text-zinc-200 mt-1">{script.hook}</p>
          </div>

          {/* Intro */}
          <div>
            <span className="text-violet-400 font-semibold text-xs uppercase tracking-wide">
              Intro
            </span>
            <p className="text-zinc-200 mt-1">{script.intro}</p>
          </div>

          {/* Items */}
          <div>
            <span className="text-violet-400 font-semibold text-xs uppercase tracking-wide">
              Top 10
            </span>
            <div className="mt-2 space-y-3">
              {script.items.map((item) => (
                <div
                  key={item.rank}
                  className="pl-3 border-l-2 border-zinc-600"
                >
                  <p className="text-white font-medium">
                    {item.rank}위: {item.title}
                  </p>
                  <p className="text-zinc-400 mt-0.5">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div>
            <span className="text-violet-400 font-semibold text-xs uppercase tracking-wide">
              CTA
            </span>
            <p className="text-zinc-200 mt-1">{script.cta}</p>
          </div>

          {/* Metadata */}
          <div className="pt-3 border-t border-zinc-700">
            <span className="text-zinc-500 text-xs uppercase tracking-wide">
              YouTube 메타데이터
            </span>
            <p className="text-zinc-300 mt-1 font-medium">
              {script.metadata.title}
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              {script.metadata.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {script.metadata.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
