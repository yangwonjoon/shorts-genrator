import type { TTSRequest, TTSResult, VoiceInfo } from '@/types';

export interface TTSService {
  synthesize(request: TTSRequest): Promise<TTSResult>;
  listVoices(): Promise<VoiceInfo[]>;
}
