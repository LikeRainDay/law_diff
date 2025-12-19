'use client';

import React from 'react';
import { ArticleChange, ArticleChangeType, ArticleInfo } from '@/lib/types';
import * as DiffMatchPatch from 'diff-match-patch';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  GitMerge,
  GitBranch,
  ArrowRightLeft,
  AlertCircle
} from 'lucide-react';

interface AlignedArticleViewProps {
  changes: ArticleChange[];
  showIdentical?: boolean;
  language?: 'zh' | 'en';
}

export function AlignedArticleView({ changes, showIdentical = true, language = 'zh' }: AlignedArticleViewProps) {
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const t = (key: string) => getTranslation(key, language);

  // Extract all available tags
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    changes.forEach(c => c.tags?.forEach(t => tags.add(t)));
    // Ensure standard types are present if they exist as primary type
    changes.forEach(c => tags.add(c.type));
    return Array.from(tags).sort();
  }, [changes]);

  const visibleChanges = React.useMemo(() => {
    // 1. Filter out technical root nodes
    const validChanges = changes.filter(c =>
      c.oldArticle?.number !== 'root' &&
      c.newArticles?.[0]?.number !== 'root'
    );

    // 2. Filter identical if needed
    let filtered = showIdentical ? validChanges : validChanges.filter(c => c.type !== 'unchanged');

    // 3. Apply Tag Filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(c => {
        const articleTags = c.tags || [c.type];
        return selectedTags.some(tag => articleTags.includes(tag) || c.type === tag);
      });
    }

    // 4. Custom Sort by Line Number (Natural Order)
    return [...filtered].sort((a, b) => {
       const getLine = (c: ArticleChange) => {
          if (c.oldArticle?.startLine) return c.oldArticle.startLine;
          if (c.newArticles?.[0]?.startLine) return c.newArticles[0].startLine;
          return 999999;
       };
       return getLine(a) - getLine(b);
    });

  }, [changes, showIdentical, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Group changes by hierarchy to show headers
  const rows_with_headers: { header?: string[], change: ArticleChange }[] = [];
  let last_parents: string = "";

  visibleChanges.forEach(change => {
    // Determine hierarchy from either old or new article
    const parents = change.newArticles?.[0]?.parents || change.oldArticle?.parents || [];
    const parentKey = parents.join(' > ');

    if (parentKey !== last_parents && parents.length > 0) {
      rows_with_headers.push({ header: parents, change });
      last_parents = parentKey;
    } else {
      rows_with_headers.push({ change });
    }
  });

  return (
    <div className="flex flex-col gap-6 font-sans text-slate-800 dark:text-slate-200">
      {/* Interactive Filter Bar */}
      <div className="sticky top-0 z-20 flex flex-wrap gap-2 border-b border-border/60 bg-background/95 px-6 py-4 text-xs font-semibold backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <span className="flex items-center text-muted-foreground mr-2 text-xs uppercase tracking-wider">{t('filter')}:</span>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={cn(
               "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all",
               selectedTags.includes(tag)
                 ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20"
                 : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
            )}
          >
             <TagDot tag={tag} />
             <span className="capitalize">{getTagLabel(tag, language)}</span>
          </button>
        ))}
        {selectedTags.length > 0 && (
          <button onClick={() => setSelectedTags([])} className="text-muted-foreground hover:text-foreground ml-auto">
             {t('clear')}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8 px-4 pb-12">
        {rows_with_headers.map((item, index) => (
          <React.Fragment key={index}>
            {/* Render Hierarchy Header */}
            {item.header && (
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <div className="h-px flex-1 bg-border"></div>
                <span>{item.header.join('  /  ')}</span>
                <div className="h-px flex-1 bg-border"></div>
              </div>
            )}

            <AlignedArticleRow change={item.change} language={language} />
          </React.Fragment>
        ))}

        {visibleChanges.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
             <p>{t('no_changes')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getTranslation(key: string, lang: 'zh' | 'en'): string {
  const dict: Record<string, Record<string, string>> = {
    'zh': {
      'filter': '筛选',
      'clear': '清除筛选',
      'no_changes': '没有符合条件的变更',
      'source': '原文 (Original)',
      'target': '现文 (Current)',
      'no_match': '无对应条款',
      'deleted_content': '条款已删除',
      'split': '条款拆分: 原条款已被拆分为多个新条款',
      'merged': '条款合并: 多个原条款已合并为此条款',
      'renumbered': '编号变更: 内容相似度较高，但编号改变',
      'moved': '位置移动: 条款位置发生显著变化'
    },
    'en': {
      'filter': 'Filter',
      'clear': 'Clear',
      'no_changes': 'No changes found',
      'source': 'Source',
      'target': 'Target',
      'no_match': 'No matching article',
      'deleted_content': 'Article deleted',
      'split': 'Split: Original article split into multiple',
      'merged': 'Merged: Multiple articles merged into this one',
      'renumbered': 'Renumbered: Content similar but number changed',
      'moved': 'Moved: Position changed significantly'
    }
  };
  return dict[lang]?.[key] || key;
}

function getTagLabel(tag: string, lang: 'zh' | 'en'): string {
  if (lang === 'en') return tag; // Default to English tag name
  const labels: Record<string, string> = {
    added: "新增",
    deleted: "删除",
    modified: "修改",
    renumbered: "编号变更",
    split: "拆分",
    merged: "合并",
    moved: "移动",
    unchanged: "无变更",
    preamble: "序言/目录",
  };
  return labels[tag] || tag;
}

function AlignedArticleRow({ change, language }: { change: ArticleChange, language: 'zh' | 'en' }) {
  const { type, oldArticle, newArticles, tags } = change;
  const t = (key: string) => getTranslation(key, language);

  // Visual cues for specific types
  const isSplit = type === 'split';
  const isMerged = type === 'merged';
  const isMoved = type === 'moved';
  const isRenumbered = type === 'renumbered';

  // Use tags if available, fallback to type
  const displayTags = (tags && tags.length > 0) ? tags : [type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md",
        type === 'unchanged' ? "border-border/40" : "border-border"
      )}
    >
      {/* Type Badges */}
      <div className="absolute -top-3 left-6 z-10 flex gap-2">
         {displayTags.map(tag => (
           <ChangeTypeBadge key={tag} type={tag} language={language} />
         ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-12">

        {/* OLD SIDE */}
        <div className="relative flex flex-col gap-4">
           <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
             {t('source')}
           </div>

           {oldArticle ? (
             <ArticleCard
                article={oldArticle}
                side="old"
                type={type}
                compareTo={newArticles?.[0]?.content}
             />
           ) : (
             <EmptyState label={t('no_match')} />
           )}
        </div>

        {/* NEW SIDE */}
        <div className="relative flex flex-col gap-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {t('target')}
          </div>

          {newArticles && newArticles.length > 0 ? (
            <div className="flex flex-col gap-4">
              {newArticles.map((article, idx) => (
                <ArticleCard
                  key={idx}
                  article={article}
                  side="new"
                  type={type}
                  compareTo={oldArticle?.content}
                  isMulti={newArticles.length > 1}
                  similarity={change.similarity}
                />
              ))}
            </div>
          ) : (
             <EmptyState label={t('deleted_content')} />
          )}
        </div>

      </div>

      {/* Explainer for complex changes */}
      {(isSplit || isMerged || isMoved || isRenumbered) && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-center gap-4">
           {isSplit && <><GitBranch className="w-4 h-4" /> <span>{t('split')}</span></>}
           {isMerged && <><GitMerge className="w-4 h-4" /> <span>{t('merged')}</span></>}
           {isRenumbered && <><ArrowRight className="w-4 h-4" /> <span>{t('renumbered')}</span></>}
           {isMoved && <><ArrowRightLeft className="w-4 h-4" /> <span>{t('moved')}</span></>}
        </div>
      )}

    </motion.div>
  );
}

function ChangeTypeBadge({ type, language }: { type: string, language: 'zh' | 'en' }) {
  // Map simplified types to styles
  let normalizedType = type;
  if (['added', 'deleted', 'modified', 'renumbered', 'split', 'merged', 'moved', 'unchanged', 'preamble'].includes(type)) {
     normalizedType = type;
  } else {
     normalizedType = 'unknown';
  }

  const styles: Record<string, string> = {
    added: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-green-200 dark:border-green-800",
    deleted: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-800",
    modified: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    renumbered: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    split: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    merged: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    moved: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    unchanged: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    preamble: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  };

  const style = styles[normalizedType] || "bg-slate-100 text-slate-600";
  const label = getTagLabel(normalizedType, language);

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm capitalize", style)}>
      {label}
    </span>
  );
}

function TagDot({ tag }: { tag: string }) {
    const colors: Record<string, string> = {
        added: "bg-green-500",
        deleted: "bg-red-500",
        modified: "bg-amber-500",
        renumbered: "bg-purple-500",
        split: "bg-blue-500",
        merged: "bg-indigo-500",
        moved: "bg-pink-500",
        unchanged: "bg-slate-500",
        preamble: "bg-teal-500",
    };
    return <span className={cn("h-2 w-2 rounded-full", colors[tag] || "bg-slate-400")} />;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[80px] w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-400">
      {label}
    </div>
  );
}

interface ArticleCardProps {
  article: ArticleInfo;
  type: ArticleChangeType;
  side: 'old' | 'new';
  compareTo?: string;
  isMulti?: boolean;
  similarity?: number;
}

function ArticleCard({ article, type, side, compareTo, isMulti, similarity }: ArticleCardProps) {
  const isModifiedLike = ['modified', 'renumbered', 'split', 'merged'].includes(type);

  // Render Diff Content
  let contentDisplay: React.ReactNode = article.content;

  if (isModifiedLike && compareTo) {
     contentDisplay = highlightDiff(
       side === 'old' ? article.content : compareTo,
       side === 'old' ? compareTo : article.content,
       side
     );
  }

  // Unified White Styling as requested
  // "Source" uses a dashed border to imply 'original/past'.
  // "Target" uses a solid border + shadow to imply 'current/real'.
  // BOTH use bg-white to avoid "ugly gray" backgrounds.

  return (
    <div className={cn(
      "group relative flex flex-col gap-2 rounded-lg border p-4 text-sm leading-relaxed transition-colors",

      // Common Base: White bg (in light mode)
      "bg-white dark:bg-slate-900",

      // Source vs Target specific styling
      side === 'old'
        ? "border-dashed border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400"
        : "border-solid border-slate-200 shadow-sm text-slate-800 dark:border-slate-800 dark:text-slate-200",

      // Status Highlights (Subtle)
      (type === 'added' && side === 'new') && "ring-1 ring-green-500/20 bg-green-50/10",
      (type === 'deleted' && side === 'old') && "ring-1 ring-red-500/20 bg-red-50/10",

      isMulti && "ml-4 border-l-4 border-l-blue-400/50"
    )}>
      {/* Header Line */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-1">
         <div className="flex items-center gap-2 overflow-hidden">
            <span className={cn(
              "font-bold font-mono text-xs",
              side === 'old' ? "text-slate-500" : "text-slate-700 dark:text-slate-300"
            )}>
              {article.number}
            </span>
            {article.title && (
                <span className="text-xs text-muted-foreground truncate" title={article.title}>{article.title}</span>
            )}
         </div>

         {/* Similarity Badge (Top Right) */}
         {similarity !== undefined && side === 'new' && (
            <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" title="Similarity Score">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                <span>{(similarity * 100).toFixed(0)}%</span>
            </div>
         )}
      </div>

      {/* Content */}
      <div className={cn(
        "whitespace-pre-wrap break-words font-sans",
        // Pure Deletion style
        type === 'deleted' && side === 'old' && "line-through text-slate-400 decoration-slate-400/50"
      )}>
        {contentDisplay}
      </div>
    </div>
  );
}

function highlightDiff(text1: string, text2: string, side: 'old' | 'new') {
  const dmp = new DiffMatchPatch.diff_match_patch();
  const diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map((diff, i) => {
    const [type, text] = diff;
    if (type === 0) return <span key={i}>{text}</span>;

    const isAddition = type === 1;
    const isDeletion = type === -1;

    if (side === 'old' && isDeletion) {
      return (
        <span key={i} className="bg-red-100 text-red-900 decoration-red-900/30 line-through decoration-2 dark:bg-red-900/30 dark:text-red-100 dark:decoration-red-100/50 rounded-sm px-0.5">
          {text}
        </span>
      );
    }

    if (side === 'new' && isAddition) {
      return (
        <span key={i} className="bg-green-100 text-green-950 font-bold dark:bg-green-900/30 dark:text-green-50 rounded-sm px-0.5">
          {text}
        </span>
      );
    }

    return null;
  });
}
