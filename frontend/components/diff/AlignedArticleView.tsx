'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Tag,
  ChevronRight,
  ChevronDown,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  GitBranch,
  GitMerge,
  ArrowRightLeft,
  Info,
  SlidersHorizontal,
  LayoutGrid,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArticleChange, ArticleInfo, ArticleChangeType } from '@/lib/types';
import * as DiffMatchPatch from 'diff-match-patch';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface AlignedArticleViewProps {
  changes: ArticleChange[];
  language?: 'zh' | 'en';
  showIdentical?: boolean;
}

export function AlignedArticleView({
  changes,
  language = 'zh',
  showIdentical: initialShowIdentical = true
}: AlignedArticleViewProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [simRange, setSimRange] = useState<[number, number]>([0, 100]);
  const [invertSim, setInvertSim] = useState(false);
  const [showIdentical, setShowIdentical] = useState(initialShowIdentical);

  const t = (key: string) => getTranslation(key, language);

  const allTags = useMemo(() => {
    const presentTags = new Set<string>();
    changes.forEach(c => {
      if (c.type) presentTags.add(c.type);
      if (c.tags) c.tags.forEach(t => presentTags.add(t));
    });
    const order = ['added', 'deleted', 'modified', 'renumbered', 'split', 'merged', 'moved', 'replaced', 'preamble', 'unchanged'];
    return order.filter(tag => presentTags.has(tag));
  }, [changes]);

  const visibleChanges = useMemo(() => {
    // 1. First filter valid entries
    const validChanges = (changes || []).filter(c => c && (c.oldArticle || (c.newArticles && c.newArticles.length > 0)));

    // 2. Filter identical if needed
    let filtered = showIdentical ? validChanges : validChanges.filter(c => c.type !== 'unchanged');

    // 3. Apply Tag Filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(c => {
        const articleTags = c.tags || [c.type];
        return selectedTags.some(tag => articleTags.includes(tag) || c.type === tag);
      });
    }

    // 4. Apply Similarity Filter
    const [min, max] = simRange;
    filtered = filtered.filter(c => {
      const sim = (c.similarity ?? (c.type === 'unchanged' ? 1 : 0)) * 100;
      const inRange = sim >= min && sim <= max;
      return invertSim ? !inRange : inRange;
    });

    // 5. Custom Sort by Line Number (Natural Order)
    return [...filtered].sort((a, b) => {
       const getLine = (c: ArticleChange) => {
          if (c.oldArticle?.startLine) return c.oldArticle.startLine;
          if (c.newArticles?.[0]?.startLine) return c.newArticles[0].startLine;
          return 999999;
       };
       return getLine(a) - getLine(b);
    });

  }, [changes, showIdentical, selectedTags, simRange, invertSim]);

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
    <div className="flex flex-col gap-8 font-sans text-foreground">
      {/* Premium Filter Control Panel */}
      <div className="sticky top-0 z-30 flex flex-col border border-border bg-background shadow-2xl shadow-blue-900/5 rounded-2xl overflow-hidden mb-8 transition-all duration-300">
        {/* Row 1: Tags - Crisp White */}
        <div className="flex flex-wrap items-center gap-4 px-8 py-5 border-b border-border bg-background">
          <div className="flex items-center text-muted-foreground mr-2">
            <Filter className="w-4 h-4 mr-2.5 text-primary/60" />
            <span className="text-[11px] uppercase tracking-[0.15em] font-black">{t('filter')}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-1.5 rounded-full border transition-all duration-200 text-[11px] font-bold",
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                    : "bg-secondary text-muted-foreground border-transparent hover:border-border hover:bg-background hover:text-foreground"
                )}
              >
                <TagDot tag={tag} isSelected={selectedTags.includes(tag)} />
                <span className="capitalize">{getTagLabel(tag, language)}</span>
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="ml-auto text-primary px-3 py-1 rounded-md hover:bg-primary/10 text-[11px] font-black tracking-widest transition-all uppercase"
            >
              {t('clear')}
            </button>
          )}
        </div>

        {/* Row 2: Similarity Slider - Subtle Blue Accent */}
        <div className="flex flex-wrap items-center gap-10 px-8 py-5 bg-blue-50/30 dark:bg-slate-900/30">
           <div className="flex items-center gap-8 flex-1">
              <div className="flex items-center text-muted-foreground whitespace-nowrap">
                <SlidersHorizontal className="w-4 h-4 mr-2.5 text-primary/60" />
                <span className="text-[11px] uppercase tracking-[0.15em] font-black">{t('similarity_range')}</span>
              </div>
              <div className="flex-1 px-6">
                 <Slider
                    defaultValue={[0, 100]}
                    max={100}
                    step={1}
                    value={simRange}
                    onValueChange={(val) => setSimRange(val as [number, number])}
                    className="cursor-pointer"
                 />
              </div>
              <div className="flex items-center gap-2 min-w-[120px] justify-end">
                 <span className="text-[11px] font-black text-foreground bg-background px-3 py-1 rounded-lg border border-border shadow-soft">{simRange[0]}%</span>
                 <span className="text-muted-foreground opacity-40 font-bold">~</span>
                 <span className="text-[11px] font-black text-foreground bg-background px-3 py-1 rounded-lg border border-border shadow-soft">{simRange[1]}%</span>
              </div>
           </div>

           <div className="flex items-center gap-4 border-l border-border pl-10">
              <Label htmlFor="invert-sim" className="text-[11px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer select-none">
                {t('invert_label')}
              </Label>
              <Switch
                 id="invert-sim"
                 checked={invertSim}
                 onCheckedChange={setInvertSim}
                 className="data-[state=checked]:bg-primary"
              />
           </div>
        </div>
      </div>

      <div className="flex flex-col gap-12 px-2 pb-20">
        {rows_with_headers.map((item, index) => (
          <React.Fragment key={index}>
            {/* Render Hierarchy Header */}
            {item.header && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 pt-10 group"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-black tracking-widest uppercase text-primary/40 group-hover:text-primary transition-colors">
                  {item.header.map((parent, pIdx) => (
                    <React.Fragment key={pIdx}>
                      <span className="cursor-default">{parent}</span>
                      {pIdx < item.header!.length - 1 && (
                        <ChevronRight className="w-4 h-4 opacity-40" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="h-[2px] flex-1 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-full" />
              </motion.div>
            )}

            <AlignedArticleRow
               idx={index}
               change={item.change}
               language={language}
            />
          </React.Fragment>
        ))}

        {visibleChanges.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground text-center">
             <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 opacity-40" />
             </div>
             <p className="text-lg font-medium">{t('no_changes')}</p>
             <p className="text-sm opacity-60 mt-2">Try adjusting your filters or similarity range.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getTranslation(key: string, lang: 'zh' | 'en'): string {
  const dict: Record<string, Record<string, string>> = {
    'zh': {
      'filter': '筛选过滤',
      'clear': '清除',
      'no_changes': '未找到匹配的变更',
      'source': '对照原文 (Source)',
      'target': '现行版本 (Target)',
      'no_match': '无对应条款',
      'deleted_content': '该条款已被完全移除',
      'split': '条款拆分: 内容被细化至多个子条款',
      'merged': '条款合并: 多个前置条款已合并为此项',
      'renumbered': '编号调整: 内容核心一致，仅序列号改变',
      'moved': '位置迁移: 该条款在全文中位置发生显著变动',
      'replaced': '编号复用: 原条款已废止，编号由新内容占用',
      'preamble': '辅助信息: 包含序言、目录等非正式条款',
      'similarity_range': '内容相似度',
      'invert_label': '反转结果',
      'min_sim': '最低',
      'max_sim': '最高'
    },
    'en': {
      'filter': 'Filter Results',
      'clear': 'Reset',
      'no_changes': 'No Matching Changes',
      'source': 'Original Source',
      'target': 'Current Target',
      'no_match': 'No match found',
      'deleted_content': 'Article has been removed',
      'split': 'Split: Expanded into multiple articles',
      'merged': 'Merged: Consolidated from multiple articles',
      'renumbered': 'Renumbered: Sequence changed only',
      'moved': 'Moved: Shifted to a new hierarchy',
      'replaced': 'Replaced: Number reused for different content',
      'preamble': 'Metadata: Preamble or index content',
      'similarity_range': 'Text Similarity',
      'invert_label': 'Invert Selection',
      'min_sim': 'Min',
      'max_sim': 'Max'
    }
  };
  return dict[lang]?.[key] || key;
}

function getTagLabel(tag: string, lang: 'zh' | 'en'): string {
  if (lang === 'en') return tag;
  const labels: Record<string, string> = {
    added: "新增",
    deleted: "删除",
    modified: "修改",
    renumbered: "更号",
    split: "拆分",
    merged: "合并",
    moved: "移动",
    unchanged: "未变",
    preamble: "说明",
    replaced: "更替",
  };
  return labels[tag] || tag;
}

function AlignedArticleRow({ change, language, idx }: { change: ArticleChange, language: 'zh' | 'en', idx: number }) {
  const { type, oldArticle, newArticles, tags } = change;
  const t = (key: string) => getTranslation(key, language);

  const displayTags = (tags && tags.length > 0) ? tags : [type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      className={cn(
        "relative rounded-[2.5rem] border p-12 transition-all",
        "bg-background border-border shadow-2xl shadow-slate-200/50 dark:shadow-none hover:shadow-primary/5 hover:border-primary/20",
        type === 'unchanged' && "opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
      )}
    >
      {/* Type Badges */}
      <div className="absolute -top-4 left-10 z-10 flex gap-3">
         {displayTags.map(tag => (
           <ChangeTypeBadge key={tag} type={tag} language={language} />
         ))}
      </div>

      {/* Top Right Similarity Badge */}
      {change.similarity !== undefined && type !== 'added' && type !== 'deleted' && (
        <div className="absolute -top-4 right-10 z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground shadow-2xl border border-primary/20 font-black text-[11px] tracking-widest uppercase">
           <Activity className="w-3.5 h-3.5" />
           <span>{Math.round(change.similarity * 100)}% Match</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:gap-20">
        {/* LEFT: OLD */}
        <div className="flex flex-col gap-6">
           <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-destructive/60" />
             {t('source')}
           </div>
           {oldArticle ? (
             <ArticleCard article={oldArticle} side="old" type={type} compareTo={newArticles?.[0]?.content} />
           ) : (
             <EmptyState label={t('no_match')} />
           )}
        </div>

        {/* RIGHT: NEW */}
        <div className="flex flex-col gap-6">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            {t('target')}
          </div>
          {newArticles && newArticles.length > 0 ? (
            <div className="flex flex-col gap-6">
              {newArticles.map((article, idx) => (
                <ArticleCard key={idx} article={article} side="new" type={type} compareTo={oldArticle?.content} isMulti={newArticles.length > 1} />
              ))}
            </div>
          ) : (
             <EmptyState label={t('deleted_content')} />
          )}
        </div>
      </div>

      {/* Complex Change Indicator Footer */}
      {['split', 'merged', 'moved', 'renumbered', 'replaced', 'preamble'].includes(type) && (
        <div className="mt-10 pt-6 border-t border-border/60 flex items-center gap-4 text-xs font-bold text-muted-foreground/80">
           <div className="p-2 bg-secondary rounded-lg">
              {type === 'split' && <GitBranch className="w-4 h-4 text-primary" />}
              {type === 'merged' && <GitMerge className="w-4 h-4 text-indigo-500" />}
              {type === 'moved' && <ArrowRightLeft className="w-4 h-4 text-pink-500" />}
              {type === 'renumbered' && <ArrowRight className="w-4 h-4 text-violet-500" />}
              {type === 'replaced' && <AlertCircle className="w-4 h-4 text-orange-500" />}
              {type === 'preamble' && <Info className="w-4 h-4 text-teal-500" />}
           </div>
           <span>{t(type)}</span>
        </div>
      )}
    </motion.div>
  );
}

function ChangeTypeBadge({ type, language }: { type: string, language: 'zh' | 'en' }) {
  const styles: Record<string, string> = {
    added: "bg-emerald-600 text-white shadow-emerald-200",
    deleted: "bg-rose-600 text-white shadow-rose-200",
    modified: "bg-amber-500 text-white shadow-amber-200",
    renumbered: "bg-violet-600 text-white shadow-violet-200",
    split: "bg-sky-600 text-white shadow-sky-200",
    merged: "bg-indigo-600 text-white shadow-indigo-200",
    moved: "bg-pink-600 text-white shadow-pink-200",
    unchanged: "bg-slate-400 text-white shadow-slate-200",
    preamble: "bg-teal-600 text-white shadow-teal-200",
    replaced: "bg-orange-600 text-white shadow-orange-200",
  };

  return (
    <span className={cn(
      "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl border border-white/20",
      styles[type] || "bg-slate-500 text-white"
    )}>
      {getTagLabel(type, language)}
    </span>
  );
}

function TagDot({ tag, isSelected }: { tag: string, isSelected: boolean }) {
    const colors: Record<string, string> = {
        added: "bg-emerald-500",
        deleted: "bg-rose-500",
        modified: "bg-amber-500",
        renumbered: "bg-violet-500",
        split: "bg-sky-500",
        merged: "bg-indigo-500",
        moved: "bg-pink-500",
        unchanged: "bg-slate-400",
        preamble: "bg-teal-500",
        replaced: "bg-orange-500",
    };
    return (
        <div className={cn(
            "h-2.5 w-2.5 rounded-full ring-2 ring-background transition-transform",
            isSelected ? "scale-125 bg-white" : colors[tag] || "bg-slate-400"
        )} />
    );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed border-border bg-secondary/20 text-xs font-bold text-muted-foreground text-center italic leading-relaxed">
      <div className="bg-background p-3 rounded-full mb-4 shadow-soft">
        <Info className="w-5 h-5 opacity-30" />
      </div>
      {label}
    </div>
  );
}

function ArticleCard({ article, type, side, compareTo, isMulti }: ArticleCardProps) {
  const isModifiedLike = ['modified', 'renumbered', 'split', 'merged'].includes(type);
  let contentDisplay: React.ReactNode = article.content;

  if (isModifiedLike && compareTo) {
     contentDisplay = highlightDiff(side === 'old' ? article.content : compareTo, side === 'old' ? compareTo : article.content, side);
  }

  return (
    <div className={cn(
      "group relative flex flex-col gap-5 rounded-3xl border p-8 text-[15px] leading-relaxed transition-all duration-500",
      // Light Mode Design: Pure White vs Subtle Slate
      side === 'old' ? "bg-secondary/40 border-border text-muted-foreground/80 font-medium" : "bg-background border-border text-foreground shadow-xl shadow-slate-200/40 ring-1 ring-primary/5 hover:ring-primary/20",
      (type === 'added' && side === 'new') && "border-emerald-500/20 shadow-emerald-100",
      (type === 'deleted' && side === 'old') && "border-rose-500/20 shadow-rose-100",
      isMulti && "ml-8 border-l-4 border-l-primary/40",
      type === 'unchanged' && "opacity-80 scale-98 border-transparent shadow-none"
    )}>
      {/* Header Line */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-2">
         <div className="flex items-center gap-3">
            <span className={cn(
              "font-black font-mono text-[13px] px-2 py-0.5 rounded bg-primary/10",
              side === 'old' ? "text-muted-foreground" : "text-primary"
            )}>
              {article.number}
            </span>
            {article.title && <span className="font-bold text-[12px] text-foreground/90">{article.title}</span>}
         </div>
      </div>
      <div className={cn("whitespace-pre-wrap font-sans leading-loose tracking-tight", type === 'deleted' && side === 'old' && "line-through opacity-60")}>
        {contentDisplay}
      </div>
    </div>
  );
}

interface ArticleCardProps {
  article: ArticleInfo;
  type: ArticleChangeType;
  side: 'old' | 'new';
  compareTo?: string;
  isMulti?: boolean;
}

function highlightDiff(text1: string, text2: string, side: 'old' | 'new') {
  const dmp = new DiffMatchPatch.diff_match_patch();
  const diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map((diff, i) => {
    const [type, text] = diff;
    if (type === 0) return <span key={i}>{text}</span>;

    // Use our new professional CSS variables
    if (side === 'old' && type === -1) {
      return (
        <span key={i} className="bg-diff-delete-bg text-diff-delete font-black decoration-diff-delete/30 line-through rounded-sm px-1 py-0.5 mx-0.5 border border-diff-delete/10">
          {text}
        </span>
      );
    }

    if (side === 'new' && type === 1) {
      return (
        <span key={i} className="bg-diff-add-bg text-diff-add font-black border border-diff-add/10 rounded-sm px-1 py-0.5 mx-0.5 shadow-sm">
          {text}
        </span>
      );
    }
    return null;
  });
}
