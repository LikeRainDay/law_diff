'use client';

import React from 'react';
import { ArticleChange, ArticleChangeType } from '@/lib/types';
import * as DiffMatchPatch from 'diff-match-patch';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface AlignedArticleViewProps {
  changes: ArticleChange[];
  showIdentical?: boolean;
}

export function AlignedArticleView({ changes, showIdentical = true }: AlignedArticleViewProps) {
  // Filter out identical items if requested
  const visibleChanges = showIdentical
    ? changes
    : changes.filter(c => c.type !== 'unchanged');

  return (
    <div className="flex flex-col gap-4">
      {/* Header Row */}
      <div className="grid grid-cols-2 gap-4 rounded-t-lg border-b border-border bg-muted/30 p-4 text-sm font-medium text-muted-foreground">
        <div>旧版本 (Source)</div>
        <div>新版本 (Target)</div>
      </div>

      {/* Content Rows */}
      <div className="flex flex-col gap-2">
        {visibleChanges.map((change, index) => (
          <AlignedArticleRow key={index} change={change} />
        ))}

        {visibleChanges.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            没有符合条件的变更显示
          </div>
        )}
      </div>
    </div>
  );
}

function AlignedArticleRow({ change }: { change: ArticleChange }) {
  const { type, oldArticle, newArticles } = change;

  // Determine row style based on type
  const getRowStyle = () => {
    switch (type) {
      case 'added': return 'border-l-4 border-l-green-500 bg-green-500/5';
      case 'deleted': return 'border-l-4 border-l-red-500 bg-red-500/5';
      case 'modified': return 'border-l-4 border-l-amber-500 bg-amber-500/5';
      case 'renumbered': return 'border-l-4 border-l-purple-500 bg-purple-500/5';
      case 'split': return 'border-l-4 border-l-blue-500 bg-blue-500/5';
      case 'merged': return 'border-l-4 border-l-indigo-500 bg-indigo-500/5';
      default: return 'border-l-4 border-l-transparent hover:bg-muted/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid grid-cols-2 gap-4 rounded-lg border p-4 transition-all",
        getRowStyle()
      )}
    >
      {/* Left Column (Old) */}
      <div className="flex flex-col gap-2">
        {oldArticle ? (
          <ArticleCard article={oldArticle} type={type} side="old" compareTo={newArticles?.[0]?.content} />
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-border/50 bg-muted/5 p-4 text-sm text-muted-foreground">
            无对应条款
          </div>
        )}
      </div>

      {/* Right Column (New) */}
      <div className="flex flex-col gap-2">
        {newArticles && newArticles.length > 0 ? (
          newArticles.map((article, idx) => (
            <ArticleCard
              key={idx}
              article={article}
              type={type}
              side="new"
              compareTo={oldArticle?.content}
              isMulti={newArticles.length > 1}
            />
          ))
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-border/50 bg-muted/5 p-4 text-sm text-muted-foreground">
            条款已删除
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ArticleCardProps {
  article: {
    number: string;
    content: string;
  };
  type: ArticleChangeType;
  side: 'old' | 'new';
  compareTo?: string;
  isMulti?: boolean;
}

function ArticleCard({ article, type, side, compareTo, isMulti }: ArticleCardProps) {
  const isModified = type === 'modified' || type === 'renumbered' || type === 'split' || type === 'merged';

  // Conditionally highlight diffs
  let contentDisplay: React.ReactNode = article.content;
  if (isModified && compareTo) {
    contentDisplay = highlightDiff(
      side === 'old' ? article.content : compareTo,
      side === 'old' ? compareTo : article.content,
      side
    );
  }

  return (
    <div className={cn(
      "rounded border bg-card p-3 shadow-sm",
      isMulti && "ml-4 border-l-2 border-l-blue-400"
    )}>
      <div className="mb-1 flex items-center gap-2">
        <span className={cn(
          "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold",
          side === 'old'
            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
        )}>
          {article.number}
        </span>
        {type === 'renumbered' && (
          <span className="text-[10px] text-purple-500">(变更)</span>
        )}
      </div>
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90 font-mono">
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

    if (side === 'old') {
      return type === -1 ? (
        <span key={i} className="bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-100 rounded px-0.5 decoration-clone">
          {text}
        </span>
      ) : null;
    } else {
      return type === 1 ? (
        <span key={i} className="bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-100 rounded px-0.5 decoration-clone">
          {text}
        </span>
      ) : null;
    }
  });
}
