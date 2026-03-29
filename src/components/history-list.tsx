'use client';

import type { GenerationStatus } from '@/types';

interface HistoryItem {
  id: string;
  topic: string;
  status: GenerationStatus;
  createdAt: string | number | Date;
  error?: string | null;
}

interface HistoryListProps {
  items: HistoryItem[];
}

const STATUS_LABELS: Record<GenerationStatus, { label: string; color: string }> =
  {
    pending: { label: '대기 중', color: 'text-zinc-400' },
    scripting: { label: '스크립트 생성 중', color: 'text-yellow-400' },
    tts: { label: '음성 생성 중', color: 'text-yellow-400' },
    composing: { label: '영상 합성 중', color: 'text-yellow-400' },
    done: { label: '완료', color: 'text-green-400' },
    failed: { label: '실패', color: 'text-red-400' },
  };

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

export function HistoryList({ items }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        생성 이력이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.pending;
        return (
          <div
            key={item.id}
            className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{item.topic}</p>
              <p className="text-zinc-500 text-xs mt-1">
                {formatDate(item.createdAt)}
              </p>
              {item.error && (
                <p className="text-red-400 text-xs mt-1 truncate">
                  {item.error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 ml-4">
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
  );
}
