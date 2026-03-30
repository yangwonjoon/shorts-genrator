import type { GenerationRecord, ScriptResult } from '@/types';

type RawRecord = {
  id: string;
  topic: string;
  status: GenerationRecord['status'];
  progressStep: string | null;
  progressMessage: string | null;
  progressLog: string | string[] | null;
  progressCurrent: number | null;
  progressTotal: number | null;
  inputMode: 'topic' | 'script';
  script: string | ScriptResult | null;
  audioPath: string | null;
  videoPath: string | null;
  finalPath: string | null;
  error: string | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

function parseScript(value: RawRecord['script']): ScriptResult | null {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as ScriptResult;
    } catch {
      return null;
    }
  }

  return value as ScriptResult;
}

function parseLog(value: RawRecord['progressLog']): string[] | null {
  if (!value) return [];

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as string[];
    } catch {
      return [];
    }
  }

  return value as string[];
}

export function normalizeGenerationRecord(record: RawRecord): GenerationRecord {
  return {
    ...record,
    progressLog: parseLog(record.progressLog),
    script: parseScript(record.script),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}
