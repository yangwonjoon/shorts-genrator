'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { GenerationStatus } from '@/types';

interface HistoryItem {
  id: string;
  topic: string;
  status: GenerationStatus;
  progressMessage?: string | null;
  progressCurrent?: number | null;
  progressTotal?: number | null;
  createdAt: string | number | Date;
  error?: string | null;
}

interface HistoryListProps {
  items: HistoryItem[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
}

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<GenerationStatus, { label: string; color: string }> =
  {
    pending: { label: '대기 중', color: 'text-zinc-400' },
    scripting: { label: '스크립트 생성 중', color: 'text-yellow-400' },
    tts: { label: '음성 생성 중', color: 'text-yellow-400' },
    background: { label: '배경 영상 수집 중', color: 'text-yellow-400' },
    composing: { label: '영상 합성 중', color: 'text-yellow-400' },
    done: { label: '완료', color: 'text-green-400' },
    failed: { label: '실패', color: 'text-red-400' },
  };

const ACTIVE_STATUSES = new Set<GenerationStatus>([
  'pending',
  'scripting',
  'tts',
  'background',
  'composing',
]);

function formatDate(value: string | number | Date): string {
  const date =
    value instanceof Date
      ? value
      : new Date(typeof value === 'number' ? value * 1000 : value);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryList({
  items,
  onDelete,
  onBulkDelete,
}: HistoryListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const validSelectedIds = useMemo(
    () => selectedIds.filter((id) => items.some((item) => item.id === id)),
    [items, selectedIds]
  );

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, currentPage]);

  const allVisibleSelected =
    pagedItems.length > 0 &&
    pagedItems.every((item) => validSelectedIds.includes(item.id));

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        생성 이력이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <label className="flex items-center gap-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedIds((prev) => [
                  ...new Set([...prev, ...pagedItems.map((item) => item.id)]),
                ]);
              } else {
                setSelectedIds((prev) =>
                  prev.filter((id) => !pagedItems.some((item) => item.id === id))
                );
              }
            }}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
          />
          현재 페이지 전체 선택
        </label>
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-500">
            총 {items.length}개 중 {validSelectedIds.length}개 선택
          </p>
          <button
            type="button"
            onClick={() => onBulkDelete(validSelectedIds)}
            disabled={validSelectedIds.length === 0}
            className="px-4 py-2 text-sm bg-red-600/80 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors"
          >
            선택 삭제
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {pagedItems.map((item) => {
        const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.pending;
        const checked = selectedIds.includes(item.id);
        return (
          <div
            key={item.id}
            className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-center justify-between gap-4"
          >
            <label className="self-start pt-1">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds((prev) => [...prev, item.id]);
                  } else {
                    setSelectedIds((prev) => prev.filter((id) => id !== item.id));
                  }
                }}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
              />
            </label>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{item.topic}</p>
              <p className="text-zinc-500 text-xs mt-1">
                {formatDate(item.createdAt)}
              </p>
              {item.progressMessage && (
                <p className="text-zinc-400 text-xs mt-1 truncate">
                  {item.progressMessage}
                </p>
              )}
              {item.error && (
                <p className="text-red-400 text-xs mt-1 truncate">
                  {item.error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-4 flex-wrap justify-end">
              {ACTIVE_STATUSES.has(item.status) && (
                <Link
                  href={`/history/${item.id}`}
                  className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors"
                >
                  이어서 보기
                </Link>
              )}
              <Link
                href={`/history/${item.id}`}
                className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded-md transition-colors"
              >
                상세
              </Link>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="px-3 py-1.5 text-xs bg-red-600/80 hover:bg-red-500 text-white rounded-md transition-colors"
              >
                삭제
              </button>
              <span className={`text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {item.status === 'done' && (
                <a
                  href={`/api/video/serve?id=${item.id}`}
                  download
                  className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors"
                >
                  다운로드
                </a>
              )}
            </div>
          </div>
        );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          페이지 {currentPage} / {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded-md transition-colors"
          >
            이전
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded-md transition-colors"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
