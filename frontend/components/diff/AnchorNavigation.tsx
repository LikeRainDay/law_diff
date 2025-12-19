'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Change, ArticleChange, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChevronRight, Plus, Minus, Edit3, Folder, FileText, ChevronDown, List, Layers, Activity } from 'lucide-react';

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
  const significantChanges = React.useMemo(() =>
    changes.filter(c => c.type !== 'unchanged'),
  [changes]);

  const scrollToChange = (index: number) => {
    // If sidebyside, we might need a different scrolling logic or target
    const targetId = viewMode === 'sidebyside' ? `chunk-${index}` : `change-${index}`;
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-primary/40');
      setTimeout(() => element.classList.remove('ring-2', 'ring-primary/40'), 1500);
    }
  };

  const t_list = language === 'zh' ? '变更追踪器' : 'Change Tracker';

  return (
    <div className={cn(
      'flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-xl glass-card transition-all duration-300',
      className
    )}>
       <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-primary" />
          {t_list}
        </h3>
        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
            {significantChanges.length}
        </span>
      </div>

      {/* Modern Mini-map / Progress Strip */}
      <div className="px-4 py-2 border-b border-border bg-background/50">
         <div className="flex gap-0.5 h-7 rounded-lg bg-muted/50 p-1 overflow-hidden ring-1 ring-border">
           {changes.slice(0, 1000).map((change, index) => { // Render limit for performance
             if (change.type === 'unchanged') return <div key={index} className="flex-1" style={{ minWidth: '1px' }} />;
             return (
               <button
                 key={index}
                 onClick={() => scrollToChange(index)}
                 className={cn(
                   'flex-1 rounded-[2px] transition-all hover:scale-150 hover:z-10 shadow-sm',
                   change.type === 'add' && 'bg-emerald-500 dark:bg-emerald-400',
                   change.type === 'delete' && 'bg-rose-500 dark:bg-rose-400',
                   change.type === 'modify' && 'bg-amber-500 dark:bg-amber-400'
                 )}
                 style={{ minWidth: '3px' }}
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

  // Group by Parent (Chapter)
  const groupedChanges = React.useMemo(() => {
    const groups: { title: string, items: { change: ArticleChange, originalIndex: number }[] }[] = [];
    let currentGroup: { title: string, items: { change: ArticleChange, originalIndex: number }[] } | null = null;

    articleChanges.forEach((change, originalIndex) => {
        if (change.type === 'unchanged') return;

        const parents = change.newArticles?.[0]?.parents || change.oldArticle?.parents || [];
        const title = parents[parents.length - 1] || (language === 'zh' ? "其他章节" : "Other Chapters");

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
      'flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-xl glass-card transition-all duration-300',
      className
    )}>
      <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-primary" />
          {t_title}
        </h3>
        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
            {articleChanges.filter(c => c.type !== 'unchanged').length}
        </span>
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
                 <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-1.5 px-1">
                     {group.items.map(({ change, originalIndex }, idx) => {
                         const type = change.type;
                         const label = change.newArticles?.[0]?.number || change.oldArticle?.number || "?";

                         return (
                            <motion.button
                                key={idx}
                                whileHover={{ scale: 1.1, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => scrollToArticle(originalIndex)}
                                className={cn(
                                    "aspect-square min-w-[32px] rounded-lg flex flex-col items-center justify-center transition-all shadow-sm ring-1 ring-border border-2 border-transparent",
                                    type === 'added' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                    type === 'deleted' ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                    type === 'modified' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                                    "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                )}
                                title={`${getTagLabel(type, language)}: 第${label}条`}
                            >
                                <span className="text-[9px] font-bold leading-none">{label}</span>
                                <div className={cn(
                                    "w-1 h-1 rounded-full mt-1",
                                    type === 'added' ? "bg-emerald-500" :
                                    type === 'deleted' ? "bg-rose-500" :
                                    type === 'modified' ? "bg-amber-500" : "bg-indigo-500"
                                )} />
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
