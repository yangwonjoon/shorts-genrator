'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { ScriptPreview } from '@/components/script-preview';
import { VideoPlayer } from '@/components/video-player';
import type { GenerationRecord } from '@/types';

const ACTIVE_STATUSES = new Set([
  'pending',
  'scripting',
  'tts',
  'background',
  'composing',
]);
const RESUME_STALE_MS = 15000;

function formatDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getProgressPercent(record: GenerationRecord): number {
  if (!record.progressTotal || record.progressTotal <= 0) return 0;
  const current = Math.max(0, Math.min(record.progressCurrent || 0, record.progressTotal));
  return Math.round((current / record.progressTotal) * 100);
}

function canResume(record: GenerationRecord): boolean {
  if (!ACTIVE_STATUSES.has(record.status)) return false;

  const updatedAt = new Date(record.updatedAt).getTime();
  if (Number.isNaN(updatedAt)) return false;

  return Date.now() - updatedAt >= RESUME_STALE_MS;
}

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [record, setRecord] = useState<GenerationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let timer: number | null = null;

    const load = async () => {
      const res = await fetch(`/api/generate?id=${id}`, { cache: 'no-store' });
      const data = (await res.json()) as GenerationRecord;
      if (!cancelled) {
        setRecord(data);
        setLoading(false);

        if (ACTIVE_STATUSES.has(data.status)) {
          timer = window.setTimeout(() => {
            void load();
          }, 2500);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [id]);

  async function handleAction(action: 'resume' | 'retry') {
    if (!id) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/generate/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      if (!res.ok) {
        window.alert(action === 'resume' ? '이어 시도에 실패했습니다' : '재시도에 실패했습니다');
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCopyLogs() {
    if (!record?.progressLog?.length) return;
    await navigator.clipboard.writeText(record.progressLog.join('\n'));
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="📄 이력 상세" />
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="📄 이력 상세" />
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          작업을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  const percent = getProgressPercent(record);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="📄 이력 상세" />
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Job ID</p>
            <p className="text-sm text-zinc-300 mt-1 break-all">{record.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {canResume(record) && (
              <button
                type="button"
                onClick={() => handleAction('resume')}
                disabled={actionLoading}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-sm text-white rounded-lg transition-colors disabled:bg-zinc-700"
              >
                이어 시도
              </button>
            )}
            {record.status === 'failed' && (
              <button
                type="button"
                onClick={() => handleAction('retry')}
                disabled={actionLoading}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-sm text-white rounded-lg transition-colors disabled:bg-zinc-700"
              >
                재시도
              </button>
            )}
            <Link
              href="/history"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-lg transition-colors"
            >
              이력으로 돌아가기
            </Link>
          </div>
        </div>

        <section className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl space-y-4">
          <div>
            <p className="text-sm text-zinc-500">주제</p>
            <h2 className="text-2xl font-semibold text-white mt-1">{record.topic}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">입력 방식</p>
              <p className="text-zinc-200 mt-1">
                {record.inputMode === 'script' ? '스크립트 붙여넣기' : '주제로 생성'}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">상태</p>
              <p className="text-zinc-200 mt-1">{record.progressMessage || record.status}</p>
            </div>
            <div>
              <p className="text-zinc-500">생성 시각</p>
              <p className="text-zinc-200 mt-1">{formatDate(record.createdAt)}</p>
            </div>
            <div>
              <p className="text-zinc-500">마지막 업데이트</p>
              <p className="text-zinc-200 mt-1">{formatDate(record.updatedAt)}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">진행률</span>
              <span className="text-zinc-300">{percent}%</span>
            </div>
            <div className="mt-2 h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          {record.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
              {record.error}
            </div>
          )}
        </section>

        {record.videoPath && (
          <section className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-sm text-zinc-500 mb-2">중간 산출물</p>
            <div className="space-y-2 text-sm text-zinc-300">
              {record.audioPath && <p>오디오: {record.audioPath}</p>}
              <p>배경 영상: {record.videoPath}</p>
              {record.finalPath && <p>최종 영상: {record.finalPath}</p>}
            </div>
          </section>
        )}

        {record.finalPath && (
          <section className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-sm text-zinc-500 mb-4">최종 결과</p>
            <VideoPlayer videoUrl={`/api/video/serve?id=${record.id}`} jobId={record.id} />
          </section>
        )}

        {record.script && (
          <section className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-sm text-zinc-500 mb-4">사용한 스크립트</p>
            <ScriptPreview script={record.script} />
          </section>
        )}

        <section className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">진행 로그</p>
            <button
              type="button"
              onClick={() => void handleCopyLogs()}
              disabled={(record.progressLog || []).length === 0}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-white rounded-lg transition-colors disabled:bg-zinc-900 disabled:text-zinc-500"
            >
              로그 복사
            </button>
          </div>
          <div className="space-y-2 text-sm">
            {(record.progressLog || []).length === 0 ? (
              <p className="text-zinc-500">아직 기록된 로그가 없습니다</p>
            ) : (
              (record.progressLog || []).map((line, index) => (
                <p
                  key={`${line}-${index}`}
                  className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300"
                >
                  {line}
                </p>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
