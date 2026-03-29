'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { TopicInput } from '@/components/topic-input';
import { GenerationProgress } from '@/components/generation-progress';
import { ScriptPreview } from '@/components/script-preview';
import { VideoPlayer } from '@/components/video-player';
import { STEPS } from '@/config/constants';
import type { ProgressStep, ScriptResult, GenerateResponse } from '@/types';

export default function HomePage() {
  const [topic, setTopic] = useState('');
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
    if (!topic.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setScript(null);
    setVideoUrl(null);
    setJobId(null);

    const currentSteps = initSteps();
    setSteps(currentSteps);

    // Show step progression - the /api/generate endpoint handles everything sequentially
    updateStep('script', 'active');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });

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
  }, [topic, isGenerating, initSteps, updateStep]);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="🎬 영상 생성" />

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Title - shown when idle */}
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

        <TopicInput
          value={topic}
          onChange={setTopic}
          onSubmit={handleGenerate}
          disabled={isGenerating}
        />

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
