'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { TopicInput } from '@/components/topic-input';
import { ScriptJsonInput } from '@/components/script-json-input';
import { VideoCandidateSelector } from '@/components/video-candidate-selector';
import { GenerationProgress } from '@/components/generation-progress';
import { VideoPlayer } from '@/components/video-player';
import { STEPS } from '@/config/constants';
import { validateScriptResult } from '@/lib/script/validation';
import type {
  ProgressStep,
  ScriptResult,
  GenerateResponse,
  GenerationRecord,
  GenerateFromScriptRequest,
  ManualVideoSelection,
  VideoSearchResult,
} from '@/types';

interface CandidateState {
  query: string;
  results: VideoSearchResult[];
  selectedDownloadUrl?: string;
  loading: boolean;
  error?: string;
}

function applyProgressSteps(record: Pick<GenerationRecord, 'status' | 'progressCurrent'>): ProgressStep[] {
  const steps = STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    status: 'waiting' as const,
  }));

  const order = ['script', 'tts', 'background', 'compose'];
  const completed = Math.max(0, Math.min(record.progressCurrent || 0, order.length));

  for (let i = 0; i < completed; i++) {
    steps[i].status = 'done';
  }

  if (record.status === 'failed') {
    const activeIndex = Math.min(completed, order.length - 1);
    if (steps[activeIndex]) steps[activeIndex].status = 'error';
    return steps;
  }

  if (record.status !== 'done') {
    const activeIndex = Math.min(completed, order.length - 1);
    if (steps[activeIndex]) steps[activeIndex].status = 'active';
  } else {
    steps.forEach((step) => {
      step.status = 'done';
    });
  }

  return steps;
}

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'topic' | 'script'>('topic');
  const [scriptStage, setScriptStage] = useState<'input' | 'select'>('input');
  const [topic, setTopic] = useState('');
  const [scriptJson, setScriptJson] = useState('');
  const [pendingScript, setPendingScript] = useState<ScriptResult | null>(null);
  const [videoCandidates, setVideoCandidates] = useState<CandidateState[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [script, setScript] = useState<ScriptResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initSteps = useCallback((): ProgressStep[] => {
    return STEPS.map((s) => ({
      id: s.id,
      label: s.label,
      status: 'waiting' as const,
    }));
  }, []);

  const updateStep = useCallback(
    (stepId: string, status: ProgressStep['status']) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status } : s))
      );
    },
    []
  );

  const fetchCandidates = useCallback(
    async (query: string, minDuration?: number) => {
      const response = await fetch('/api/video/background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          orientation: 'portrait',
          minDuration,
        }),
      });

      const data = (await response.json()) as { results?: VideoSearchResult[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || '영상 검색에 실패했습니다');
      }

      return data.results || [];
    },
    []
  );

  const prepareScriptSelection = useCallback(async () => {
    const parsed = JSON.parse(scriptJson) as unknown;
    const validation = validateScriptResult(parsed);

    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const validatedScript = validation.script;
    setPendingScript(validatedScript);
    setScript(validatedScript);
    setVideoUrl(null);
    setSteps([]);

    const initialCandidates: CandidateState[] = validatedScript.items.map((item) => ({
      query: item.searchQuery,
      results: [],
      selectedDownloadUrl: undefined,
      loading: true,
      error: undefined,
    }));

    setVideoCandidates(initialCandidates);
    setScriptStage('select');

    const hydrated = await Promise.all(
      validatedScript.items.map(async (item) => {
        try {
          const results = await fetchCandidates(item.searchQuery, item.duration);
          return {
            query: item.searchQuery,
            results,
            selectedDownloadUrl: results[0]?.downloadUrl,
            loading: false,
            error: undefined,
          } satisfies CandidateState;
        } catch (error) {
          return {
            query: item.searchQuery,
            results: [],
            selectedDownloadUrl: undefined,
            loading: false,
            error:
              error instanceof Error ? error.message : '영상 검색에 실패했습니다',
          } satisfies CandidateState;
        }
      })
    );

    setVideoCandidates(hydrated);
  }, [scriptJson, fetchCandidates]);

  const refreshCandidate = useCallback(
    async (itemIndex: number) => {
      const item = pendingScript?.items[itemIndex];
      const current = videoCandidates[itemIndex];

      if (!item || !current?.query.trim()) return;

      setVideoCandidates((prev) =>
        prev.map((candidate, index) =>
          index === itemIndex
            ? { ...candidate, loading: true, error: undefined }
            : candidate
        )
      );

      try {
        const results = await fetchCandidates(current.query, item.duration);
        setVideoCandidates((prev) =>
          prev.map((candidate, index) =>
            index === itemIndex
              ? {
                  ...candidate,
                  results,
                  selectedDownloadUrl: results[0]?.downloadUrl,
                  loading: false,
                  error: undefined,
                }
              : candidate
          )
        );
      } catch (error) {
        setVideoCandidates((prev) =>
          prev.map((candidate, index) =>
            index === itemIndex
              ? {
                  ...candidate,
                  loading: false,
                  error:
                    error instanceof Error
                      ? error.message
                      : '영상 검색에 실패했습니다',
                }
              : candidate
          )
        );
      }
    },
    [fetchCandidates, pendingScript, videoCandidates]
  );

  const handleGenerateFromPreparedScript = useCallback(async () => {
    if (!pendingScript) {
      throw new Error('먼저 스크립트를 준비해주세요');
    }

    updateStep('script', 'done');
    updateStep('tts', 'active');

    const videoSelections: ManualVideoSelection[] = videoCandidates.map(
      (candidate, itemIndex) => ({
        itemIndex,
        searchQuery: candidate.query,
        selectedDownloadUrl: candidate.selectedDownloadUrl,
      })
    );

    const payload: GenerateFromScriptRequest = {
      topic: pendingScript.metadata.title,
      script: pendingScript,
      videoSelections,
    };

    const res = await fetch('/api/generate-from-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return res;
  }, [pendingScript, updateStep, videoCandidates]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setScript(null);
    setVideoUrl(null);

    const currentSteps = initSteps();
    setSteps(currentSteps);

    try {
      let res: Response;

      if (mode === 'topic') {
        if (!topic.trim()) {
          throw new Error('주제를 입력해주세요');
        }

        updateStep('script', 'active');
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topic.trim() }),
        });
      } else {
        res = await handleGenerateFromPreparedScript();
      }

      const data = (await res.json()) as GenerateResponse;

      if (!res.ok || data.status === 'failed') {
        throw new Error(data.error || '생성에 실패했습니다');
      }

      if (data.id) {
        router.push(`/history/${data.id}`);
        return;
      }

      if (data.script) setScript(data.script);
      setSteps(
        applyProgressSteps({
          status: data.status,
          progressCurrent: data.progressCurrent ?? 0,
        })
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
      setError(message);

      setSteps((prev) =>
        prev.map((s) =>
          s.status === 'waiting' || s.status === 'active'
            ? { ...s, status: 'error' as const }
            : s
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }, [topic, mode, isGenerating, initSteps, updateStep, handleGenerateFromPreparedScript, router]);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="🎬 영상 생성" />

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {!isGenerating && !script && !error && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Top 10 숏폼 생성기
            </h2>
            <p className="text-zinc-400">
              주제를 입력하면 자동으로 유튜브 숏폼 영상을 만들어 드립니다
            </p>
          </div>
        )}

        <div className="w-full max-w-3xl mx-auto mb-5">
          <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
              onClick={() => {
                setMode('topic');
                setScriptStage('input');
              }}
              disabled={isGenerating}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'topic'
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              주제로 생성
            </button>
            <button
              onClick={() => setMode('script')}
              disabled={isGenerating}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'script'
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              스크립트 붙여넣기
            </button>
          </div>
        </div>

        {mode === 'topic' ? (
          <TopicInput
            value={topic}
            onChange={setTopic}
            onSubmit={handleGenerate}
            disabled={isGenerating}
          />
        ) : scriptStage === 'input' ? (
          <div className="w-full">
            <ScriptJsonInput
              value={scriptJson}
              onChange={setScriptJson}
              onSubmit={prepareScriptSelection}
              disabled={isGenerating}
            />
          </div>
        ) : (
          pendingScript && (
            <VideoCandidateSelector
              script={pendingScript}
              candidates={videoCandidates}
              disabled={isGenerating}
              onQueryChange={(itemIndex, query) =>
                setVideoCandidates((prev) =>
                  prev.map((candidate, index) =>
                    index === itemIndex ? { ...candidate, query } : candidate
                  )
                )
              }
              onRefresh={refreshCandidate}
              onSelect={(itemIndex, downloadUrl) =>
                setVideoCandidates((prev) =>
                  prev.map((candidate, index) =>
                    index === itemIndex
                      ? { ...candidate, selectedDownloadUrl: downloadUrl }
                      : candidate
                  )
                )
              }
              onContinue={handleGenerate}
            />
          )
        )}

        {steps.length > 0 && <GenerationProgress steps={steps} />}

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm max-w-md mx-auto">
            <p className="font-medium">오류 발생</p>
            <p className="mt-1 text-red-300">{error}</p>
          </div>
        )}

        {videoUrl && (
          <VideoPlayer videoUrl={videoUrl} jobId="preview" />
        )}

      </div>
    </div>
  );
}
