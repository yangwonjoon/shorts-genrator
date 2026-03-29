import 'server-only';
import type { AIService } from './ai-service';
import type { TTSService } from './tts-service';
import type { VideoService } from './video-service';

export function getAIService(): AIService {
  switch (process.env.AI_PROVIDER || 'claude') {
    case 'openai': {
      const { OpenAIProvider } = require('./openai.provider');
      return new OpenAIProvider();
    }
    default: {
      const { ClaudeProvider } = require('./claude.provider');
      return new ClaudeProvider();
    }
  }
}

export function getTTSService(): TTSService {
  switch (process.env.TTS_PROVIDER || 'elevenlabs') {
    default: {
      const { ElevenLabsProvider } = require('./elevenlabs.provider');
      return new ElevenLabsProvider();
    }
  }
}

export function getVideoService(): VideoService {
  switch (process.env.VIDEO_PROVIDER || 'pexels') {
    default: {
      const { PexelsProvider } = require('./pexels.provider');
      return new PexelsProvider();
    }
  }
}
