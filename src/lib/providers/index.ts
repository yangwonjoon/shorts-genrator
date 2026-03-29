import 'server-only';
import type { AIService } from './ai-service';
import type { TTSService } from './tts-service';
import type { VideoService } from './video-service';
import { OpenAIProvider } from './openai.provider';
import { ClaudeProvider } from './claude.provider';
import { ElevenLabsProvider } from './elevenlabs.provider';
import { PexelsProvider } from './pexels.provider';

export function getAIService(): AIService {
  switch (process.env.AI_PROVIDER || 'claude') {
    case 'openai': {
      return new OpenAIProvider();
    }
    default: {
      return new ClaudeProvider();
    }
  }
}

export function getTTSService(): TTSService {
  switch (process.env.TTS_PROVIDER || 'elevenlabs') {
    default: {
      return new ElevenLabsProvider();
    }
  }
}

export function getVideoService(): VideoService {
  switch (process.env.VIDEO_PROVIDER || 'pexels') {
    default: {
      return new PexelsProvider();
    }
  }
}
