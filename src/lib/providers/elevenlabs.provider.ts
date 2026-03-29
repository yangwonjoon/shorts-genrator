import type { TTSService } from './tts-service';
import type { TTSRequest, TTSResult, VoiceInfo } from '@/types';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export class ElevenLabsProvider implements TTSService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');
    this.apiKey = apiKey;
  }

  async synthesize(request: TTSRequest): Promise<TTSResult> {
    const voiceId = request.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel (default)

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text: request.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: request.speed || 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Estimate duration: ~150 words per minute for Korean, average 2 chars per syllable
    // Rough estimate: text length / 5 characters per second
    const estimatedDuration = Math.max(2, request.text.length / 5);

    return {
      audioBuffer,
      duration: estimatedDuration,
    };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json();
    return data.voices.map((v: { voice_id: string; name: string }) => ({
      id: v.voice_id,
      name: v.name,
    }));
  }
}
