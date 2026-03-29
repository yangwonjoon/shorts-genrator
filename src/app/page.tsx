'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { TopicInput } from '@/components/topic-input';
import { ScriptJsonInput } from '@/components/script-json-input';
import { GenerationProgress } from '@/components/generation-progress';
import { ScriptPreview } from '@/components/script-preview';
import { VideoPlayer } from '@/components/video-player';
import { STEPS } from '@/config/constants';
import { validateScriptResult } from '@/lib/script/validation';
import type {
  ProgressStep,
  ScriptResult,
  GenerateResponse,
  GenerateFromScriptRequest,
} from '@/types';

export default function HomePage() {
  const [mode, setMode] = useState<'topic' | 'script'>('topic');
  const [topic, setTopic] = useState('');
  const [scriptJson, setScriptJson] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [script, setScript] = useState<ScriptResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
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

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setScript(null);
    setVideoUrl(null);
    setJobId(null);

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
        const parsed = JSON.parse(scriptJson) as unknown;
        const validation = validateScriptResult(parsed);

        if (!validation.ok) {
          throw new Error(validation.error);
        }

        updateStep('script', 'done');
        updateStep('tts', 'active');

        const payload: GenerateFromScriptRequest = {
          topic: validation.script.metadata.title,
          script: validation.script,
        };

        res = await fetch('/api/generate-from-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = (await res.json()) as GenerateResponse;

      if (!res.ok || data.status === 'failed') {
        throw new Error(data.error || '생성에 실패했습니다');
      }

      // All steps completed
      updateStep('script', 'done');
      updateStep('tts', 'done');
      updateStep('background', 'done');
      updateStep('compose', 'done');

      if (data.script) setScript(data.script);
      if (data.videoUrl) setVideoUrl(data.videoUrl);
      if (data.id) setJobId(data.id);
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
  }, [topic, scriptJson, mode, isGenerating, initSteps, updateStep]);

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
              onClick={() => setMode('topic')}
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
        ) : (
          <ScriptJsonInput
            value={scriptJson}
            onChange={setScriptJson}
            onSubmit={handleGenerate}
            disabled={isGenerating}
          />
        )}

        {steps.length > 0 && <GenerationProgress steps={steps} />}

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm max-w-md mx-auto">
            <p className="font-medium">오류 발생</p>
            <p className="mt-1 text-red-300">{error}</p>
          </div>
        )}

        {videoUrl && jobId && (
          <VideoPlayer videoUrl={videoUrl} jobId={jobId} />
        )}

        {script && <ScriptPreview script={script} />}
      </div>
    </div>
  );
}
