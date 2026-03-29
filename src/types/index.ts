// === Script Types ===

export interface ScriptRequest {
  topic: string;
  language?: string;
  itemCount?: number;
}

export interface ScriptItem {
  rank: number;
  title: string;
  description: string;
  searchQuery: string;
  duration: number;
}

export interface ScriptResult {
  hook: string;
  intro: string;
  items: ScriptItem[];
  cta: string;
  metadata: {
    title: string;
    description: string;
    tags: string[];
  };
}

// === TTS Types ===

export interface TTSRequest {
  text: string;
  voiceId?: string;
  speed?: number;
}

export interface TTSResult {
  audioBuffer: Buffer;
  duration: number;
}

export interface VoiceInfo {
  id: string;
  name: string;
}

// === Video Types ===

export interface VideoSearchRequest {
  query: string;
  orientation?: 'portrait' | 'landscape';
  minDuration?: number;
}

export interface VideoSearchResult {
  id: string;
  downloadUrl: string;
  duration: number;
  width: number;
  height: number;
  previewUrl: string;
}

// === Generation Types ===

export type GenerationStatus =
  | 'pending'
  | 'scripting'
  | 'tts'
  | 'composing'
  | 'done'
  | 'failed';

export interface GenerationRecord {
  id: string;
  topic: string;
  status: GenerationStatus;
  script: ScriptResult | null;
  audioPath: string | null;
  videoPath: string | null;
  finalPath: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// === API Types ===

export interface GenerateRequest {
  topic: string;
  language?: string;
  itemCount?: number;
}

export interface GenerateResponse {
  id: string;
  status: GenerationStatus;
  script?: ScriptResult;
  videoUrl?: string;
  error?: string;
}

export interface ProgressStep {
  id: string;
  label: string;
  status: 'waiting' | 'active' | 'done' | 'error';
}
