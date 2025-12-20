'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Change } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface GitDiffViewProps {
  changes: Change[];
  className?: string;
}

export default function GitDiffView({ changes, className }: GitDiffViewProps) {
  return (
    <div className={cn('font-mono text-sm custom-scrollbar overflow-auto rounded-xl border border-border bg-card shadow-xl shadow-foreground/5 dark:shadow-none', className)}>
      <div className="bg-card p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg font-sans flex items-center gap-2">
             Git 风格对比
             <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Classic</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1 font-sans">红色表示删除，绿色表示新增，黄色表示行内修改</p>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {changes.map((change, index) => (
          <DiffLine key={index} change={change} index={index} />
        ))}
      </div>
    </div>
  );
}

interface DiffLineProps {
  change: Change;
  index: number;
}

const DiffLine = React.memo(({ change, index }: DiffLineProps) => {
  const getLineStyle = () => {
    switch (change.type) {
      case 'add':
        return 'bg-green-50/50 hover:bg-green-50 dark:bg-green-500/10 dark:hover:bg-green-500/20';
      case 'delete':
        return 'bg-red-50/50 hover:bg-red-50 dark:bg-red-500/10 dark:hover:bg-red-500/20';
      case 'modify':
        return 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/20';
      default:
        return 'bg-white hover:bg-slate-50 dark:bg-background dark:hover:bg-muted/50';
    }
  };

  const getPrefix = () => {
    switch (change.type) {
      case 'add': return '+';
      case 'delete': return '-';
      case 'modify': return '~';
      default: return ' ';
    }
  };

  const getPrefixColor = () => {
    switch (change.type) {
      case 'add': return 'text-green-600 dark:text-green-400';
      case 'delete': return 'text-red-600 dark:text-red-400';
      case 'modify': return 'text-amber-600 dark:text-amber-400';
      default: return 'text-muted-foreground/30';
    }
  };

  return (
    <div
      className={cn('flex transition-colors duration-150', getLineStyle())}
      id={`change-${index}`}
    >
      {/* Line numbers - Integrated Design */}
      <div className="flex-shrink-0 flex gap-2 px-3 py-2 bg-muted/20 dark:bg-muted/10 text-muted-foreground/40 select-none min-w-[90px] border-r border-border/40 font-mono text-[10px] font-medium leading-loose">
        <span className="w-8 text-right">{change.oldLine || ''}</span>
        <span className="w-8 text-right">{change.newLine || ''}</span>
      </div>

      {/* Prefix */}
      <div className={cn('flex-shrink-0 px-2 py-2 font-bold select-none w-8 text-center', getPrefixColor())}>
        {getPrefix()}
      </div>

      {/* Content */}
      <div className="flex-1 px-2 py-2 whitespace-pre-wrap break-words text-foreground">
        {change.type === 'modify' ? (
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <span className="text-red-600/60 dark:text-red-400/50 font-bold text-xs mt-1">-</span>
              <span className="line-through text-red-700/80 dark:text-red-400/80">{change.oldContent}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600/60 dark:text-green-400/50 font-bold text-xs mt-1">+</span>
              <span className="text-green-700 dark:text-green-300 font-bold">{change.newContent}</span>
            </div>
          </div>
        ) : (
          <span className={cn(
            "leading-relaxed",
            change.type === 'add' && "text-green-700 dark:text-green-300 font-bold",
            change.type === 'delete' && "text-red-700 dark:text-red-400 font-bold line-through",
            change.type === 'unchanged' && "text-foreground/80 font-medium"
          )}>
            {change.oldContent || change.newContent}
          </span>
        )}
      </div>
    </div>
  );
});

DiffLine.displayName = 'DiffLine';
