import type { AIService } from './ai-service';
import type { ScriptRequest, ScriptResult } from '@/types';
import { buildTop10Prompt } from '@/lib/prompts/top10';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

const SCRIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hook', 'intro', 'items', 'cta', 'metadata'],
  properties: {
    hook: { type: 'string' },
    intro: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['rank', 'title', 'description', 'searchQuery', 'duration'],
        properties: {
          rank: { type: 'number' },
          title: { type: 'string' },
          description: { type: 'string' },
          searchQuery: { type: 'string' },
          duration: { type: 'number' },
        },
      },
    },
    cta: { type: 'string' },
    metadata: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'description', 'tags'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
} as const;

interface OpenAIResponse {
  error?: {
    message?: string;
  };
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}

function extractOutputText(response: OpenAIResponse): string {
  const texts: string[] = [];

  for (const item of response.output || []) {
    if (!item.content) continue;

    for (const content of item.content) {
      if (
        (content.type === 'output_text' || content.type === 'text') &&
        typeof content.text === 'string'
      ) {
        texts.push(content.text);
      }
    }
  }

  return texts.join('\n').trim();
}

export class OpenAIProvider implements AIService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    this.apiKey = apiKey;
  }

  async generateScript(request: ScriptRequest): Promise<ScriptResult> {
    const prompt = buildTop10Prompt(request);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        input: prompt,
        text: {
          format: {
            type: 'json_schema',
            name: 'shorts_script',
            strict: true,
            schema: SCRIPT_SCHEMA,
          },
        },
      }),
    });

    const data = (await response.json()) as OpenAIResponse;

    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI request failed');
    }

    const text = extractOutputText(data);
    if (!text) {
      throw new Error('OpenAI returned empty output');
    }

    const parsed = JSON.parse(text) as ScriptResult;

    if (!parsed.hook || !parsed.intro || !parsed.items || !parsed.cta) {
      throw new Error('Invalid script structure');
    }

    return parsed;
  }
}
