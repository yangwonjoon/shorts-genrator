import type { AIService } from './ai-service';
import type { ScriptRequest, ScriptResult } from '@/types';

export class OpenAIProvider implements AIService {
  async generateScript(_request: ScriptRequest): Promise<ScriptResult> {
    throw new Error('OpenAI provider is not implemented yet');
  }
}
