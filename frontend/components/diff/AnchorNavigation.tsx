'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Change, ArticleChange } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChevronRight, Plus, Minus, Edit3, Folder, FileText, ChevronDown, List } from 'lucide-react';

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
  className?: string;
  language?: 'zh' | 'en';
}

export default function AnchorNavigation({ changes, articleChanges, className, language = 'zh' }: AnchorNavigationProps) {
  // If we have structural changes, use Tree View
  if (articleChanges && articleChanges.length > 0) {
    return <StructureTreeNavigation articleChanges={articleChanges} className={className} language={language} />;
  }

  // Fallback to Git Line View
  return <GitLineNavigation changes={changes} className={className} language={language} />;
}


// --- Git Line View (Refined) ---
function GitLineNavigation({ changes, className, language = 'zh' }: { changes: Change[], className?: string, language?: 'zh' | 'en' }) {
  const significantChanges = changes.filter(c => c.type !== 'unchanged');

  const scrollToChange = (index: number) => {
    const element = document.getElementById(`change-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const t_list = language === 'zh' ? '变更列表' : 'Change List';

  return (
    <div className={cn('flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm', className)}>
       <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-medium text-sm text-slate-700 flex items-center gap-2">
          <List className="w-4 h-4 text-slate-400" />
          {t_list}
        </h3>
        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {significantChanges.length}
        </span>
      </div>

      {/* Modern Mini-map */}
      <div className="px-3 py-2 border-b border-slate-100 bg-white">
         <div className="flex gap-0.5 h-6 rounded bg-slate-50 p-0.5">
           {changes.map((change, index) => {
             if (change.type === 'unchanged') return <div key={index} className="flex-1 bg-transparent" style={{ minWidth: '1px' }} />;
             return (
               <button
                 key={index}
                 onClick={() => scrollToChange(index)}
                 className={cn(
                   'flex-1 rounded-[1px] transition-all hover:scale-125 hover:z-10',
                   change.type === 'add' && 'bg-emerald-400',
                   change.type === 'delete' && 'bg-rose-400',
                   change.type === 'modify' && 'bg-amber-400'
                 )}
                 style={{ minWidth: '2px' }}
                 title={`${getTagLabel(change.type, language)} - L${change.oldLine || change.newLine}`}
               />
             );
           })}
         </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
         {significantChanges.map((change, idx) => (
           <div key={idx} onClick={() => scrollToChange(changes.indexOf(change))}
                className={cn(
                  "cursor-pointer px-3 py-2 rounded-lg text-xs border transition-all duration-200",
                  "hover:shadow-sm hover:border-slate-300 bg-white border-slate-100",
                  change.type === 'add' && "hover:bg-emerald-50/30",
                  change.type === 'delete' && "hover:bg-rose-50/30",
                  change.type === 'modify' && "hover:bg-amber-50/30"
                )}>
               <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    change.type === 'add' ? "bg-emerald-500" :
                    change.type === 'delete' ? "bg-rose-500" : "bg-amber-500"
                  )} />
                  <span className="font-semibold text-slate-700">
                    {getTagLabel(change.type, language)}
                  </span>
                  <span className="ml-auto font-mono text-slate-400 text-[10px]">L{change.oldLine || change.newLine}</span>
               </div>
               <div className="text-slate-500 line-clamp-1 opacity-90 pl-3.5">
                 {change.oldContent || change.newContent}
               </div>
           </div>
         ))}
      </div>
    </div>
  );
}

// --- Structure Stripe View (Dense & Visual) ---
function StructureTreeNavigation({ articleChanges, className, language = 'zh' }: { articleChanges: ArticleChange[], className?: string, language?: 'zh' | 'en' }) {
  const visibleChanges = articleChanges.filter(c => c.type !== 'unchanged');

  const scrollToArticle = (index: number) => {
    // Scroll to the specific article row using ID assigned in AlignedArticleView
    const element = document.getElementById(`article-row-${index}`);
    if (element) {
       element.scrollIntoView({ behavior: 'smooth', block: 'center' });
       element.classList.add('ring-2', 'ring-primary/20');
       setTimeout(() => element.classList.remove('ring-2', 'ring-primary/20'), 2000);
    }
  };

  const t_title = language === 'zh' ? '变更导航' : 'Navigation';

  // Group by Parent (Chapter) for alignment with original indices
  const groupedChanges: { title: string, items: { change: ArticleChange, originalIndex: number }[] }[] = [];
  let currentGroup: { title: string, items: { change: ArticleChange, originalIndex: number }[] } | null = null;

  articleChanges.forEach((change, originalIndex) => {
      if (change.type === 'unchanged') return;

      const parents = change.newArticles?.[0]?.parents || change.oldArticle?.parents || [];
      const title = parents[parents.length - 1] || (language === 'zh' ? "其他" : "Other");

      if (!currentGroup || currentGroup.title !== title) {
          if (currentGroup) groupedChanges.push(currentGroup);
          currentGroup = { title, items: [{ change, originalIndex }] };
      } else {
          currentGroup.items.push({ change, originalIndex });
      }
  });
  if (currentGroup) groupedChanges.push(currentGroup);

  return (
    <div className={cn('flex flex-col h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm', className)}>
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-medium text-sm text-slate-700 flex items-center gap-2">
          <Folder className="w-4 h-4 text-slate-400" />
          {t_title}
        </h3>
        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {visibleChanges.length}
        </span>
      </div>

      <div className="overflow-y-auto custom-scrollbar p-2 space-y-4">
         {groupedChanges.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
               {language === 'zh' ? '无结构性变更' : 'No structural changes'}
            </div>
         ) : groupedChanges.map((group, gIdx) => (
             <div key={gIdx} className="space-y-1.5">
                 {/* Group Title (Tiny) */}
                 <div className="text-[10px] font-medium text-slate-400 px-1 truncate" title={group.title}>
                     {group.title}
                 </div>

                 {/* Visual Stripes for this Group */}
                 <div className="flex flex-wrap gap-1 px-1">
                     {group.items.map(({ change, originalIndex }, idx) => {
                         const type = change.type;
                         const label = change.newArticles?.[0]?.number || change.oldArticle?.number || "?";

                         return (
                            <button
                                key={idx}
                                onClick={() => scrollToArticle(originalIndex)}
                                className={cn(
                                    "h-6 min-w-[6px] flex-1 rounded-sm transition-all hover:scale-110 hover:z-10 shadow-sm relative group",
                                    type === 'added' ? "bg-emerald-400 hover:bg-emerald-500" :
                                    type === 'deleted' ? "bg-rose-400 hover:bg-rose-500" :
                                    type === 'modified' ? "bg-amber-400 hover:bg-amber-500" :
                                    "bg-indigo-400 hover:bg-indigo-500"
                                )}
                                title={`${getTagLabel(type, language)}: ${label}`}
                            >
                            </button>
                         );
                     })}
                 </div>
             </div>
         ))}
      </div>
    </div>
  );
}
