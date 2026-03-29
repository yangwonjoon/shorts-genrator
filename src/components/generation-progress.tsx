'use client';

import type { ProgressStep } from '@/types';

interface GenerationProgressProps {
  steps: ProgressStep[];
}

export function GenerationProgress({ steps }: GenerationProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto mt-10">
      <div className="space-y-1">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-4">
            {/* Vertical line + circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  step.status === 'done'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : step.status === 'active'
                      ? 'bg-violet-500/20 border-violet-500 text-violet-400 animate-pulse'
                      : step.status === 'error'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-zinc-800 border-zinc-600 text-zinc-500'
                }`}
              >
                {step.status === 'done'
                  ? '✓'
                  : step.status === 'error'
                    ? '✕'
                    : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 h-6 ${
                    step.status === 'done' ? 'bg-green-500/40' : 'bg-zinc-700'
                  }`}
                />
              )}
            </div>

            {/* Label */}
            <span
              className={`text-sm font-medium ${
                step.status === 'done'
                  ? 'text-green-400'
                  : step.status === 'active'
                    ? 'text-violet-300'
                    : step.status === 'error'
                      ? 'text-red-400'
                      : 'text-zinc-500'
              }`}
            >
              {step.label}
              {step.status === 'active' && '...'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
