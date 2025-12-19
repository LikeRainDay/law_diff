'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Change, ArticleChange, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Plus, Minus, Edit3, Folder, FileText, ChevronDown, List, Layers, Activity } from 'lucide-react';

// Helper for translations
function getTagLabel(tag: string, lang: 'zh' | 'en' = 'zh'): string {
  if (lang === 'en') return tag;

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
    add: "新增",
    delete: "删除",
    modify: "修改",
  };
  return labels[tag] || tag;
}

interface AnchorNavigationProps {
  changes: Change[];
  articleChanges?: ArticleChange[];
  viewMode: ViewMode;
  className?: string;
  language?: 'zh' | 'en';
}

export default function AnchorNavigation({ changes, articleChanges, viewMode, className, language = 'zh' }: AnchorNavigationProps) {
  // If we are in structure view, use Tree View
  if (viewMode === 'article-structure') {
    return <StructureTreeNavigation
      articleChanges={articleChanges || []}
      className={className}
      language={language}
    />;
  }

  // Fallback to Git Line View for 'git' and 'sidebyside'
  return <GitLineNavigation
    changes={changes}
    className={className}
    language={language}
    viewMode={viewMode}
  />;
}


// --- Git Line View (Refined) ---
const GitLineNavigation = React.memo(({
  changes,
  className,
  viewMode,
  language = 'zh'
}: {
  changes: Change[],
  className?: string,
  viewMode: ViewMode,
  language?: 'zh' | 'en'
}) => {
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [currentNavIdx, setCurrentNavIdx] = React.useState(0);
  const minimapRef = React.useRef<HTMLDivElement>(null);

  const significantChanges = React.useMemo(() =>
    changes.filter(c => c.type !== 'unchanged'),
  [changes]);

  const significantIndices = React.useMemo(() =>
    changes.map((c, i) => c.type !== 'unchanged' ? i : -1).filter(i => i !== -1),
  [changes]);

  // Track scroll position to update the mini-map indicator
  React.useEffect(() => {
    const handleScroll = () => {
      const winScroll = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (height <= 0) return;

      const progress = winScroll / height;
      setScrollProgress(progress);

      // Auto-scroll the minimap stripes to match documentation progress
      if (minimapRef.current) {
        const scrollWidth = minimapRef.current.scrollWidth;
        const clientWidth = minimapRef.current.clientWidth;
        const maxScroll = scrollWidth - clientWidth;
        if (maxScroll > 0) {
           minimapRef.current.scrollLeft = progress * maxScroll;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToChange = (index: number) => {
    setCurrentNavIdx(index);
    // If sidebyside, we might need a different scrolling logic or target
    const targetId = viewMode === 'sidebyside' ? `chunk-${index}` : `change-${index}`;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-primary/40');
      setTimeout(() => element.classList.remove('ring-2', 'ring-primary/40'), 1500);
    }
  };

  const navToChange = (direction: 'next' | 'prev') => {
    if (significantIndices.length === 0) return;

    let nextIdx = 0;
    if (direction === 'next') {
        const found = significantIndices.find(i => i > currentNavIdx);
        nextIdx = found !== undefined ? found : significantIndices[0];
    } else {
        const found = [...significantIndices].reverse().find(i => i < currentNavIdx);
        nextIdx = found !== undefined ? found : significantIndices[significantIndices.length - 1];
    }

    scrollToChange(nextIdx);
  };

  const t_list = language === 'zh' ? '变更追踪器' : 'Change Tracker';

  return (
    <div className={cn(
      'flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-xl glass-card transition-all duration-300',
      className
    )}>
       <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">{t_list}</h3>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 ml-2">
              {significantChanges.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
           <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => navToChange('prev')}
                disabled={significantChanges.length === 0}
            >
             <ChevronLeft className="w-4 h-4" />
           </Button>
           <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => navToChange('next')}
                disabled={significantChanges.length === 0}
            >
             <ChevronRight className="w-4 h-4" />
           </Button>
        </div>
      </div>

      {/* Modern Mini-map / Progress Strip */}
      <div className="px-4 py-3 border-b border-border bg-background/50 relative">
         <div
            ref={minimapRef}
            className="flex gap-[1px] h-8 rounded-lg bg-muted/30 p-1 overflow-x-auto custom-scrollbar ring-1 ring-border relative z-10 scroll-smooth"
         >
           {/* Viewport Indicator inside the scrollable area */}
           <div
              className="absolute top-0 bottom-0 w-8 bg-primary/20 border-x border-primary/40 pointer-events-none transition-all duration-300 z-20"
              style={{
                left: `${scrollProgress * 100}%`,
                transform: 'translateX(-50%)',
                minWidth: '20px'
              }}
           />

           {changes.slice(0, 1000).map((change, index) => {
             if (change.type === 'unchanged') return <div key={index} className="flex-1" style={{ minWidth: '1px' }} />;
             return (
               <button
                 key={index}
                 onClick={() => scrollToChange(index)}
                 className={cn(
                   'flex-1 rounded-[1px] transition-all hover:scale-[2] hover:z-20 shadow-sm shrink-0',
                   change.type === 'add' && 'bg-green-600',
                   change.type === 'delete' && 'bg-red-600',
                   change.type === 'modify' && 'bg-amber-500'
                 )}
                 style={{ minWidth: '4px' }}
                 title={`${getTagLabel(change.type, language)} - L${change.oldLine || change.newLine}`}
               />
             );
           })}
         </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar p-3 space-y-2 flex-grow">
         {significantChanges.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2 opacity-50">
             <FileText className="w-8 h-8" />
             <span className="text-xs">{language === 'zh' ? '暂无显著变更' : 'No major changes'}</span>
           </div>
         ) : significantChanges.slice(0, 200).map((change, idx) => ( // Render limit for sidebar list
            <motion.div
                 key={idx}
                 whileHover={{ x: 4 }}
                 onClick={() => scrollToChange(changes.indexOf(change))}
                 className={cn(
                   "cursor-pointer px-4 py-3 rounded-xl text-[13px] border transition-all duration-300 group",
                   "bg-background/40 border-border hover:bg-background hover:border-primary/30",
                   change.type === 'add' && "hover:border-emerald-500/30",
                   change.type === 'delete' && "hover:border-rose-500/30",
                   change.type === 'modify' && "hover:border-amber-500/30"
                 )}>
               <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn(
                    "w-2 h-2 rounded-full ring-2 ring-offset-2 ring-transparent transition-all group-hover:ring-current/20",
                    change.type === 'add' ? "bg-emerald-500 text-emerald-500" :
                    change.type === 'delete' ? "bg-rose-500 text-rose-500" : "bg-amber-500 text-amber-500"
                  )} />
                  <span className="font-bold text-foreground">
                    {getTagLabel(change.type, language)}
                  </span>
                  <span className="ml-auto font-mono text-muted-foreground text-[10px] bg-muted px-1.5 py-0.5 rounded">
                    L{change.oldLine || change.newLine}
                  </span>
               </div>
               <div className="text-muted-foreground line-clamp-2 text-xs leading-relaxed group-hover:text-foreground/80 transition-colors">
                 {change.oldContent || change.newContent}
               </div>
            </motion.div>
         ))}
         {significantChanges.length > 200 && (
           <div className="text-center py-2 text-[10px] text-muted-foreground italic">
             ... {significantChanges.length - 200} more changes (Check map above)
           </div>
         )}
      </div>
    </div>
  );
});

GitLineNavigation.displayName = 'GitLineNavigation';

// --- Structure Stripe View ---
const StructureTreeNavigation = React.memo(({ articleChanges, className, language = 'zh' }: { articleChanges: ArticleChange[], className?: string, language?: 'zh' | 'en' }) => {
  const scrollToArticle = (index: number) => {
    const element = document.getElementById(`article-row-${index}`);
    if (element) {
       element.scrollIntoView({ behavior: 'smooth', block: 'center' });
       element.classList.add('ring-4', 'ring-primary/30', 'bg-primary/5');
       setTimeout(() => element.classList.remove('ring-4', 'ring-primary/30', 'bg-primary/5'), 2000);
    }
  };

  const t_title = language === 'zh' ? '结构化视图' : 'Structure View';

  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
  const [currentNavIdx, setCurrentNavIdx] = React.useState<number>(0);

  const significantChangeIndices = React.useMemo(() => {
    return articleChanges
      .map((c, i) => (c.type !== 'unchanged' ? i : -1))
      .filter(i => i !== -1);
  }, [articleChanges]);

  const navToChange = (direction: 'next' | 'prev') => {
    if (significantChangeIndices.length === 0) return;

    let nextIdx = 0;
    if (direction === 'next') {
        const found = significantChangeIndices.find(i => i > currentNavIdx);
        nextIdx = found !== undefined ? found : significantChangeIndices[0];
    } else {
        const found = [...significantChangeIndices].reverse().find(i => i < currentNavIdx);
        nextIdx = found !== undefined ? found : significantChangeIndices[significantChangeIndices.length - 1];
    }

    setCurrentNavIdx(nextIdx);
    scrollToArticle(nextIdx);
  };

  // Group by Parent (full hierarchy to avoid collisions)
  const groupedChanges = React.useMemo(() => {
    const groups: { title: string, items: { change: ArticleChange, originalIndex: number }[] }[] = [];
    let currentGroup: { title: string, items: { change: ArticleChange, originalIndex: number }[] } | null = null;

    articleChanges.forEach((change, originalIndex) => {
        if (change.type === 'unchanged') return;

        const parents = change.newArticles?.[0]?.parents || change.oldArticle?.parents || [];
        // Use full hierarchy to avoid grouping "Section 1" of different chapters together wrongly
        const title = parents.length > 0 ? parents.join(' / ') : (language === 'zh' ? "其他章节" : "Other Chapters");

        if (!currentGroup || currentGroup.title !== title) {
            if (currentGroup) groups.push(currentGroup);
            currentGroup = { title, items: [{ change, originalIndex }] };
        } else {
            currentGroup.items.push({ change, originalIndex });
        }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [articleChanges, language]);

  return (
    <div className={cn(
      'flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-xl glass-card transition-all duration-300 relative',
      className
    )}>
      {/* Popover Preview (Top out) */}
      <AnimatePresence>
        {hoveredIdx !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-16 left-4 right-4 z-50 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-4 pointer-events-none"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {getTagLabel(articleChanges[hoveredIdx].type, language)}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                 {articleChanges[hoveredIdx].similarity ? `Similarity: ${(articleChanges[hoveredIdx].similarity! * 100).toFixed(0)}%` : ""}
              </span>
            </div>
            <div className="text-xs leading-relaxed line-clamp-4 text-foreground/90 italic">
               "{articleChanges[hoveredIdx].newArticles?.[0]?.content || articleChanges[hoveredIdx].oldArticle?.content}"
            </div>
            <div className="mt-2 text-[9px] text-muted-foreground">
               Click to jump to line {articleChanges[hoveredIdx].newArticles?.[0]?.startLine || articleChanges[hoveredIdx].oldArticle?.startLine}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">{t_title}</h3>
          <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 ml-2">
              {significantChangeIndices.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
           <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => navToChange('prev')}
                disabled={significantChangeIndices.length === 0}
            >
             <ChevronLeft className="w-4 h-4" />
           </Button>
           <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => navToChange('next')}
                disabled={significantChangeIndices.length === 0}
            >
             <ChevronRight className="w-4 h-4" />
           </Button>
        </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar p-3 space-y-6 flex-grow">
         {groupedChanges.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-40">
               <Folder className="w-10 h-10" />
               <span className="text-xs font-medium">{language === 'zh' ? '未检测到结构性变更' : 'No structural changes detected'}</span>
            </div>
         ) : groupedChanges.map((group, gIdx) => (
             <div key={gIdx} className="space-y-2.5">
                 {/* Group Title Section */}
                 <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3 bg-primary/40 rounded-full" />
                    <div className="text-[11px] font-bold text-foreground/70 uppercase tracking-wider truncate" title={group.title}>
                        {group.title}
                    </div>
                 </div>

                 {/* Visual Stripes for this Group */}
                 <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-2 px-1">
                     {group.items.map(({ change, originalIndex }, idx) => {
                         const type = change.type;
                         const oldLabel = change.oldArticle?.number;
                         const newLabel = change.newArticles?.[0]?.number;
                         const label = newLabel || oldLabel || "?";
                         const isRenumbered = oldLabel && newLabel && oldLabel !== newLabel;

                         return (
                            <motion.button
                                key={idx}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onMouseEnter={() => setHoveredIdx(originalIndex)}
                                onMouseLeave={() => setHoveredIdx(null)}
                                onClick={() => scrollToArticle(originalIndex)}
                                className={cn(
                                    "relative min-h-[40px] px-1 rounded-lg flex flex-col items-center justify-center transition-all shadow-sm ring-1 ring-border border-2 border-transparent",
                                    type === 'added' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                    type === 'deleted' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                    type === 'modified' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                    "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                )}
                                title={`${getTagLabel(type, language)}: 第${label}条`}
                            >
                                <div className="flex flex-col items-center">
                                    {isRenumbered ? (
                                        <div className="flex flex-col items-center leading-none">
                                            <span className="text-[7px] opacity-60 line-through">{oldLabel}</span>
                                            <span className="text-[9px] font-black">{newLabel}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold leading-none">{label}</span>
                                    )}
                                </div>
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full mt-1.5",
                                    type === 'added' ? "bg-emerald-500" :
                                    type === 'deleted' ? "bg-rose-500" :
                                    type === 'modified' ? "bg-amber-500" : "bg-indigo-500"
                                )} />

                                {isRenumbered && (
                                    <div className="absolute -top-1 -right-1">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full border border-white dark:border-slate-900" />
                                    </div>
                                )}
                            </motion.button>
                         );
                     })}
                 </div>
             </div>
         ))}
      </div>

      {/* Legend Footer */}
      <div className="p-3 bg-muted/20 border-t border-border mt-auto flex flex-wrap gap-x-4 gap-y-2 justify-center">
          {[
              { color: 'bg-emerald-500', label: 'added' },
              { color: 'bg-rose-500', label: 'deleted' },
              { color: 'bg-amber-500', label: 'modified' }
          ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", l.color)} />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                      {getTagLabel(l.label, language)}
                  </span>
              </div>
          ))}
      </div>
    </div>
  );
});

StructureTreeNavigation.displayName = 'StructureTreeNavigation';
