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
  const visibleChanges = showIdentical
    ? changes
    : changes.filter(c => c.type !== 'unchanged');

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header Row - Sticky */}
      <div className="sticky top-0 z-10 grid grid-cols-2 gap-8 border-b border-slate-200 bg-white/95 px-6 py-4 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
          旧版本 (Source)
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          新版本 (Target)
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col gap-4 px-2 pb-8">
        {visibleChanges.map((change, index) => (
          <AlignedArticleRow key={index} change={change} />
        ))}

        {visibleChanges.length === 0 && (
          <div className="py-12 text-center text-slate-500">
            没有符合条件的变更显示
          </div>
        )}
      </div>
    </div>
  );
}

function AlignedArticleRow({ change }: { change: ArticleChange }) {
  const { type, oldArticle, newArticles } = change;

  // Status Indicator Color
  const getStatusColor = () => {
    switch (type) {
      case 'added': return 'bg-green-500';
      case 'deleted': return 'bg-red-500';
      case 'modified': return 'bg-amber-500';
      case 'renumbered': return 'bg-purple-500';
      case 'split': return 'bg-blue-500';
      case 'merged': return 'bg-indigo-500';
      default: return 'bg-slate-200 dark:bg-slate-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group relative grid grid-cols-2 gap-8 rounded-xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50"
    >
      {/* Status Bar Indicator */}
      {type !== 'unchanged' && (
        <div className={cn("absolute left-0 top-6 h-full w-1 rounded-r-md transition-all group-hover:w-1.5", getStatusColor())} style={{ height: 'calc(100% - 48px)' }} />
      )}

      {/* Left Column (Old) */}
      <div className="flex flex-col gap-3">
        {oldArticle ? (
          <ArticleCard
            article={oldArticle}
            type={type}
            side="old"
            compareTo={newArticles?.[0]?.content}
          />
        ) : (
          <EmptyState label="无对应条款" />
        )}
      </div>

      {/* Right Column (New) */}
      <div className="flex flex-col gap-3">
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
          <EmptyState label="条款已删除" />
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[100px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900/20">
      {label}
    </div>
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

  // Highlight Logic
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
      "relative flex flex-col gap-2",
      isMulti && "pl-4 border-l-2 border-slate-200 dark:border-slate-700"
    )}>
      {/* Article Number Badge */}
      <div className="flex items-baseline justify-between">
        <span className={cn(
          "inline-flex items-center rounded-md px-2.5 py-1 text-sm font-bold tracking-tight shadow-sm ring-1 ring-inset",
          side === 'old'
            ? "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
            : "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800"
        )}>
          {article.number}
        </span>

        {type === 'renumbered' && (
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">变更编号</span>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "whitespace-pre-wrap break-words text-base leading-7 text-slate-800 dark:text-slate-200",
        // Only strike through if it's a pure deletion, otherwise diff highlights handle it
        type === 'deleted' && side === 'old' && "line-through decoration-slate-400/50 text-slate-500"
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
        <span key={i} className="bg-green-100 text-green-950 font-medium dark:bg-green-900/30 dark:text-green-50 rounded-sm px-0.5 box-decoration-clone">
          {text}
        </span>
      );
    }

    return null;
  });
}
