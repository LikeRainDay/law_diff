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
  AlertCircle,
  Info,
  Activity
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
                  ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 shadow-sm"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
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

            <AlignedArticleRow
              change={item.change}
              language={language}
              idx={changes.indexOf(item.change)}
            />
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
      'moved': '位置移动: 条款位置发生显著变化',
      'replaced': '编号重用: 旧条文已删除，该编号被新内容占用',
      'preamble': '序言/目录: 法律文件的非条文部分'
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
      'moved': 'Moved: Position changed significantly',
      'replaced': 'Reassigned: Old article deleted, number reused for new content',
      'preamble': 'Preamble: Non-article content / Metadata'
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
    replaced: "删除并调整",
  };
  return labels[tag] || tag;
}

function AlignedArticleRow({ change, language, idx }: { change: ArticleChange, language: 'zh' | 'en', idx: number }) {
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
        "relative rounded-[2rem] border p-8 transition-all hover:shadow-lg",
        // Base container: Pure Minimalist
        "bg-transparent border-slate-200/60 dark:border-slate-800",

        // Unchanged articles are flat and borderless
        type === 'unchanged' ? "border-transparent opacity-60 grayscale-[0.3]" : "shadow-xl shadow-slate-100 dark:shadow-none"
      )}
      id={`article-row-${idx}`}
    >
      {/* Type Badges */}
      <div className="absolute -top-3 left-6 z-10 flex gap-2">
         {displayTags.map(tag => (
           <ChangeTypeBadge key={tag} type={tag} language={language} />
         ))}
      </div>

      {/* Top Right Similarity Badge */}
      {change.similarity !== undefined && type !== 'added' && type !== 'deleted' && (
        <div className="absolute -top-3 right-6 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white border border-blue-700 shadow-lg font-black text-[10px] tracking-tight whitespace-nowrap">
           <Activity className="w-3 h-3" />
           <span>{(change.similarity * 100).toFixed(0)}% {language === 'zh' ? '相似度' : 'Similarity'}</span>
        </div>
      )}

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
                />
              ))}
            </div>
          ) : (
             <EmptyState label={t('deleted_content')} />
          )}
        </div>

      </div>

      {/* Explainer for complex changes */}
      {(isSplit || isMerged || isMoved || isRenumbered || type === 'replaced' || type === 'preamble') && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-center gap-4">
           {isSplit && <><GitBranch className="w-4 h-4" /> <span>{t('split')}</span></>}
           {isMerged && <><GitMerge className="w-4 h-4" /> <span>{t('merged')}</span></>}
           {isRenumbered && <><ArrowRight className="w-4 h-4" /> <span>{t('renumbered')}</span></>}
           {isMoved && <><ArrowRightLeft className="w-4 h-4" /> <span>{t('moved')}</span></>}
           {type === 'replaced' && <><AlertCircle className="w-4 h-4 text-amber-500" /> <span>{t('replaced')}</span></>}
           {type === 'preamble' && <><Info className="w-4 h-4 text-teal-500" /> <span>{t('preamble')}</span></>}
        </div>
      )}

    </motion.div>
  );
}

function ChangeTypeBadge({ type, language }: { type: string, language: 'zh' | 'en' }) {
  // Map simplified types to styles
  let normalizedType = type;
  const knownTypes = ['added', 'deleted', 'modified', 'renumbered', 'split', 'merged', 'moved', 'unchanged', 'preamble', 'replaced'];
  if (knownTypes.includes(type)) {
     normalizedType = type;
  } else {
     normalizedType = 'unknown';
  }

  const styles: Record<string, string> = {
    added: "bg-green-700 text-white border-green-800 shadow-md",
    deleted: "bg-red-700 text-white border-red-800 shadow-md",
    modified: "bg-amber-600 text-white border-amber-700 shadow-md",
    renumbered: "bg-violet-700 text-white border-violet-800 shadow-md",
    split: "bg-sky-700 text-white border-sky-800 shadow-md",
    merged: "bg-indigo-700 text-white border-indigo-800 shadow-md",
    moved: "bg-pink-700 text-white border-pink-700 shadow-md",
    unchanged: "bg-slate-500 text-white border-slate-600 shadow-sm",
    preamble: "bg-teal-700 text-white border-teal-800 shadow-md",
    replaced: "bg-orange-700 text-white border-orange-800 shadow-md",
    unknown: "bg-slate-400 text-white shadow-sm"
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
        replaced: "bg-orange-500",
    };
    return <span className={cn("h-2 w-2 rounded-full", colors[tag] || "bg-slate-400")} />;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[100px] w-full items-center justify-center rounded-xl border-2 border-dashed border-muted bg-muted/20 p-6 text-xs text-muted-foreground font-medium italic">
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
      "group relative flex flex-col gap-3 rounded-2xl border p-6 text-[14px] leading-relaxed transition-all duration-300",

      // Source (Old) - No Background, just a subtle dashed border
      side === 'old' && [
        "bg-transparent border-dashed border-slate-200 text-slate-500",
        "dark:border-slate-800 dark:text-slate-400"
      ],

      // Target (New) - Clean White Card (Solid)
      side === 'new' && [
        "bg-white border-solid border-slate-200 shadow-xl shadow-slate-200/40 text-slate-800 ring-1 ring-slate-100",
        "dark:bg-slate-900 dark:border-slate-800 dark:shadow-none dark:text-slate-200 dark:ring-0"
      ],

      // Status Highlights (Subtle Ring, No BG)
      (type === 'added' && side === 'new') && "border-green-500/30 ring-1 ring-green-500/10 bg-transparent",
      (type === 'deleted' && side === 'old') && "border-red-500/30 ring-1 ring-red-500/10 bg-transparent",

      isMulti && "ml-6 border-l-4 border-l-primary/20",

      // If unchanged, eliminate almost everything
      type === 'unchanged' && "border-transparent shadow-none ring-0 p-0"
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

         {/* Similarity Badge removed from here and moved to parent row */}
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
        <span key={i} className="bg-red-500/15 text-red-600 font-bold decoration-red-500/40 line-through decoration-[1.5px] dark:bg-red-500/20 dark:text-red-400 dark:decoration-red-400/50 rounded px-0.5">
          {text}
        </span>
      );
    }

    if (side === 'new' && isAddition) {
      return (
        <span key={i} className="bg-green-600/15 text-green-700 font-bold dark:bg-green-500/20 dark:text-green-300 rounded px-0.5 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.1)]">
          {text}
        </span>
      );
    }

    return null;
  });
}
