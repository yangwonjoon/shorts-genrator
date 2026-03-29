import type { ScriptRequest, ScriptResult } from '@/types';

export interface AIService {
  generateScript(request: ScriptRequest): Promise<ScriptResult>;
}
