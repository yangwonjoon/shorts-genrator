import type { ScriptResult } from '@/types';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateScriptResult(
  value: unknown
): { ok: true; script: ScriptResult } | { ok: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { ok: false, error: '스크립트는 JSON 객체여야 합니다' };
  }

  const script = value as Partial<ScriptResult>;

  if (!isNonEmptyString(script.hook)) {
    return { ok: false, error: 'hook이 필요합니다' };
  }

  if (!isNonEmptyString(script.intro)) {
    return { ok: false, error: 'intro가 필요합니다' };
  }

  if (!Array.isArray(script.items) || script.items.length === 0) {
    return { ok: false, error: 'items는 하나 이상의 항목이 필요합니다' };
  }

  for (const item of script.items) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.rank !== 'number' ||
      !isNonEmptyString(item.title) ||
      !isNonEmptyString(item.description) ||
      !isNonEmptyString(item.searchQuery) ||
      typeof item.duration !== 'number'
    ) {
      return {
        ok: false,
        error:
          '각 item에는 rank, title, description, searchQuery, duration이 필요합니다',
      };
    }
  }

  if (!isNonEmptyString(script.cta)) {
    return { ok: false, error: 'cta가 필요합니다' };
  }

  if (
    !script.metadata ||
    typeof script.metadata !== 'object' ||
    !isNonEmptyString(script.metadata.title) ||
    !isNonEmptyString(script.metadata.description) ||
    !Array.isArray(script.metadata.tags) ||
    script.metadata.tags.some((tag) => !isNonEmptyString(tag))
  ) {
    return {
      ok: false,
      error: 'metadata에는 title, description, tags가 필요합니다',
    };
  }

  return { ok: true, script: script as ScriptResult };
}
