// Legal article structure types
export interface CompareOptions {
  detectEntities: boolean;
  granularity: 'line' | 'word' | 'char';
  nerMode?: 'regex' | 'bert' | 'hybrid';
  alignThreshold?: number;
  formatText?: boolean;
}
export interface ArticleNode {
  type: 'chapter' | 'section' | 'article' | 'clause' | 'item';
  number: string;
  title?: string;
  content: string;
  children: ArticleNode[];
}

export interface LegalArticle {
  id: string;
  version: string;
  title: string;
  content: string;
  ast?: ArticleNode;
}

// Diff result types
export type ChangeType = 'add' | 'delete' | 'modify' | 'unchanged';

export interface Change {
  type: ChangeType;
  oldLine?: number;
  newLine?: number;
  oldContent?: string;
  newContent?: string;
  entities?: Entity[];
}

// Structural Diff Types (Pro Feature)
export type ArticleChangeType =
  | 'unchanged'
  | 'modified'
  | 'renumbered'  // Content similar but number changed
  | 'split'       // One article split into multiple
  | 'merged'      // Multiple articles merged into one
  | 'moved'       // Position changed significantly
  | 'added'
  | 'deleted';

export interface ArticleInfo {
  number: string;
  content: string;
  title?: string;
  startLine: number;
}

export interface ArticleChange {
  type: ArticleChangeType;
  oldArticle?: ArticleInfo;
  newArticles?: ArticleInfo[];
  similarity?: number;
  details?: Change[]; // Word-level diff within matched articles
}

export interface DiffResult {
  similarity: number;
  changes: Change[];
  articleChanges?: ArticleChange[]; // Structural diff result (Pro feature)
  entities: Entity[];
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
    unchanged: number;
  };
}

// Named entity types
export type EntityType = 'date' | 'scope' | 'registry' | 'penalty' | 'amount' | 'other';

export interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}

// View mode
export type ViewMode = 'git' | 'sidebyside' | 'article-structure';
