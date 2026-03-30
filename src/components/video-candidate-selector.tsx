'use client';

import Image from 'next/image';
import type {
  ScriptResult,
  VideoSearchResult,
} from '@/types';

interface CandidateState {
  query: string;
  results: VideoSearchResult[];
  selectedDownloadUrl?: string;
  loading: boolean;
  error?: string;
}

interface VideoCandidateSelectorProps {
  script: ScriptResult;
  candidates: CandidateState[];
  disabled: boolean;
  onQueryChange: (itemIndex: number, query: string) => void;
  onRefresh: (itemIndex: number) => void;
  onSelect: (itemIndex: number, downloadUrl: string) => void;
  onContinue: () => void;
}

export function VideoCandidateSelector({
  script,
  candidates,
  disabled,
  onQueryChange,
  onRefresh,
  onSelect,
  onContinue,
}: VideoCandidateSelectorProps) {
  const readyCount = candidates.filter((candidate) => candidate.selectedDownloadUrl)
    .length;

  return (
    <div className="w-full max-w-6xl mx-auto mt-8">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">대표 이미지 선택</h3>
        <p className="text-sm text-zinc-400 mt-2">
          각 항목에 맞는 Pexels 사진을 골라주세요. 마음에 들지 않으면 검색어를 수정하고 다시 불러올 수 있습니다.
        </p>
      </div>

      <div className="space-y-6">
        {script.items.map((item, index) => {
          const candidate = candidates[index];

          return (
            <section
              key={item.rank}
              className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl"
            >
              <div className="mb-4">
                <p className="text-sm text-violet-400 font-semibold">
                  {item.rank}위
                </p>
                <h4 className="text-lg font-semibold text-white mt-1">
                  {item.title}
                </h4>
                <p className="text-sm text-zinc-400 mt-2">{item.description}</p>
              </div>

              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={candidate?.query || ''}
                  onChange={(e) => onQueryChange(index, e.target.value)}
                  disabled={disabled}
                  className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={() => onRefresh(index)}
                  disabled={disabled || !candidate?.query?.trim()}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-600 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {candidate?.loading ? '불러오는 중...' : '다시 검색'}
                </button>
              </div>

              {candidate?.error && (
                <p className="text-sm text-red-400 mb-3">{candidate.error}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {candidate?.results?.map((result) => {
                  const isSelected = candidate.selectedDownloadUrl === result.downloadUrl;

                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => onSelect(index, result.downloadUrl)}
                      className={`text-left rounded-2xl overflow-hidden border transition-all ${
                        isSelected
                          ? 'border-violet-500 ring-2 ring-violet-500/40'
                          : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="relative aspect-[9/16] bg-zinc-950">
                        {result.previewUrl ? (
                          <Image
                            src={result.previewUrl}
                            alt={item.title}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">
                            미리보기 없음
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-zinc-900">
                        <p className="text-xs text-zinc-300">
                          {result.width} x {result.height}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          화면 유지 {result.duration}초
                        </p>
                        <p className="text-xs font-medium mt-2 text-white">
                          {isSelected ? '선택됨' : '이 사진 선택'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {candidate?.results?.length === 0 && !candidate?.loading && (
                <p className="text-sm text-zinc-500">
                  검색 결과가 없습니다. 검색어를 더 구체적으로 바꿔보세요.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-6 p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
        <p className="text-sm text-zinc-400">
          {script.items.length}개 중 {readyCount}개 항목에서 영상을 직접 골랐습니다. 선택하지 않은 항목은 해당 검색어로 자동 검색합니다.
        </p>
        <button
          onClick={onContinue}
          disabled={disabled}
          className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          선택 완료하고 생성
        </button>
      </div>
    </div>
  );
}
