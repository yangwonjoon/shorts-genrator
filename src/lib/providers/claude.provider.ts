import Anthropic from '@anthropic-ai/sdk';
import type { AIService } from './ai-service';
import type { ScriptRequest, ScriptResult } from '@/types';
import { buildTop10Prompt } from '@/lib/prompts/top10';

export class ClaudeProvider implements AIService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    this.client = new Anthropic({ apiKey });
  }

  async generateScript(request: ScriptRequest): Promise<ScriptResult> {
    const prompt = buildTop10Prompt(request);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse script response as JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]) as ScriptResult;

    // Validate structure
    if (!parsed.hook || !parsed.intro || !parsed.items || !parsed.cta) {
      throw new Error('Invalid script structure');
    }

    return parsed;
  }
}
