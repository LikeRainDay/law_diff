import * as Diff from 'diff';
import { Change, DiffResult, EntityType } from './types';

const BACKEND_API_URL = '/api/compare';
const BACKEND_HEALTH_URL = '/health';

/**
 * Check if the backend server is reachable
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(BACKEND_HEALTH_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Compare two legal texts using the Rust backend API
 * Falls back to local processing if backend is unavailable
 */
export async function compareLegalTextsAsync(
  oldText: string,
  newText: string,
  options?: Partial<{
    alignThreshold: number;
    formatText: boolean;
    detectEntities: boolean;
  }>
): Promise<DiffResult> {
  try {
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        old_text: oldText,
        new_text: newText,
        options: {
          detect_entities: options?.detectEntities ?? true,
          ner_mode: 'regex',
          align_threshold: options?.alignThreshold ?? 0.6,
          format_text: options?.formatText ?? true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.statusText}`);
    }

    const data = await response.json();
    return transformBackendResponse(data);
  } catch (error) {
    console.warn('Backend comparison failed, falling back to local processing:', error);
    return compareLegalTexts(oldText, newText);
  }
}

/**
 * Transform backend response to frontend DiffResult format
 */
function transformBackendResponse(data: any): DiffResult {
  // Backend returns snake_case, frontend uses camelCase
  // Need to map if there are differences.
  // Based on Rust structs, keys might need mapping.

  // Rust: changes: [{ type: "add", new_line: 1, ... }]
  // TS: changes: [{ type: "add", newLine: 1, ... }]

  const changes = data.changes.map((c: any) => ({
    type: c.type,
    oldLine: c.old_line,
    newLine: c.new_line,
    oldContent: c.old_content,
    newContent: c.new_content,
  }));

  // Transform article changes if present
  let articleChanges = undefined;
  if (data.article_changes) {
    articleChanges = data.article_changes.map((ac: any) => ({
      type: ac.type, // types are already lowercase strings
      oldArticle: ac.old_article ? {
        number: ac.old_article.number,
        content: ac.old_article.content,
        title: ac.old_article.title,
        startLine: ac.old_article.start_line || 0,
      } : undefined,
      newArticles: ac.new_articles ? ac.new_articles.map((na: any) => ({
        number: na.number,
        content: na.content,
        title: na.title,
        startLine: na.start_line || 0,
      })) : undefined,
      similarity: ac.similarity,
      details: ac.details,
    }));
  }

  return {
    similarity: data.similarity,
    changes,
    articleChanges,
    entities: data.entities.map((e: any) => ({
      type: e.type,
      value: e.value,
      confidence: e.confidence,
      position: e.position,
    })),
    stats: data.stats,
  };
}

/**
 * Compare two legal texts locally (Synchronous fallback)
 */
export function compareLegalTexts(oldText: string, newText: string): DiffResult {
  // Use word-level diff for better granularity
  const diffParts = Diff.diffWords(oldText, newText);

  const changes: Change[] = [];
  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let deletions = 0;
  let modifications = 0;
  let unchanged = 0;

  diffParts.forEach((part) => {
    const lineCount = (part.value.match(/\n/g) || []).length || 1;

    if (part.added) {
      changes.push({
        type: 'add',
        newLine,
        newContent: part.value,
      });
      newLine += lineCount;
      additions++;
    } else if (part.removed) {
      changes.push({
        type: 'delete',
        oldLine,
        oldContent: part.value,
      });
      oldLine += lineCount;
      deletions++;
    } else {
      // Unchanged part
      changes.push({
        type: 'unchanged',
        oldLine,
        newLine,
        oldContent: part.value,
        newContent: part.value,
      });
      oldLine += lineCount;
      newLine += lineCount;
      unchanged++;
    }
  });

  // Merge adjacent changes to detect modifications
  const mergedChanges = mergeAdjacentChanges(changes);
  modifications = mergedChanges.filter(c => c.type === 'modify').length;

  // Calculate similarity score
  const similarity = calculateSimilarity(oldText, newText);

  // Mock entity extraction (local fallback)
  const entities = extractMockEntities(oldText, newText);

  return {
    similarity,
    changes: mergedChanges,
    entities,
    stats: {
      additions,
      deletions,
      modifications,
      unchanged,
    },
  };
}

/**
 * Merge adjacent add/delete changes into modifications
 */
function mergeAdjacentChanges(changes: Change[]): Change[] {
  const merged: Change[] = [];
  let i = 0;

  while (i < changes.length) {
    const current = changes[i];
    const next = changes[i + 1];

    // Check if we have adjacent delete/add (modification)
    if (
      current &&
      next &&
      ((current.type === 'delete' && next.type === 'add') ||
       (current.type === 'add' && next.type === 'delete'))
    ) {
      const deleteChange = current.type === 'delete' ? current : next;
      const addChange = current.type === 'add' ? current : next;

      merged.push({
        type: 'modify',
        oldLine: deleteChange.oldLine,
        newLine: addChange.newLine,
        oldContent: deleteChange.oldContent,
        newContent: addChange.newContent,
      });
      i += 2;
    } else {
      merged.push(current);
      i += 1;
    }
  }

  return merged;
}

/**
 * Calculate similarity score using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Mock entity extraction (local fallback)
 */
function extractMockEntities(oldText: string, newText: string): any[] {
  const entities: any[] = [];

  // Simple regex patterns for common legal entities
  const patterns: { type: EntityType; regex: RegExp }[] = [
    { type: 'date', regex: /(\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}个月|\d+年)/g },
    { type: 'amount', regex: /([一二三四五六七八九十百千万亿\d]+元|[一二三四五六七八九十百千万\d]+万元)/g },
    { type: 'penalty', regex: /(处罚|罚款|吊销|拘留|监禁)/g },
    { type: 'registry', regex: /(登记|注册|备案|审批)/g },
  ];

  const combinedText = oldText + '\n' + newText;

  patterns.forEach(({ type, regex }) => {
    let match;
    while ((match = regex.exec(combinedText)) !== null) {
      entities.push({
        type,
        value: match[0],
        confidence: 0.85 + Math.random() * 0.1, // Mock confidence
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }
  });

  return entities;
}

/**
 * Get color for entity type
 */
export function getEntityColor(type: EntityType): string {
  const colors: Record<EntityType, string> = {
    date: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    amount: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
    penalty: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
    registry: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    scope: 'bg-yellow-500/10 text-amber-700 dark:text-yellow-300 border-yellow-500/20',
    other: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
  };
  return colors[type];
}

/**
 * Get entity type display name
 */
export function getEntityTypeLabel(type: EntityType): string {
  const labels: Record<EntityType, string> = {
    date: '日期/期限',
    amount: '金额',
    penalty: '处罚',
    registry: '登记',
    scope: '范围',
    other: '其他',
  };
  return labels[type];
}
