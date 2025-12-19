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
    <div className={cn('font-mono text-sm custom-scrollbar overflow-auto rounded-lg border', className)}>
      <div className="bg-muted/40 p-4 border-b border-border/10">
        <h3 className="font-semibold text-base font-sans flex items-center gap-2">
           Git 风格对比
           <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Classic</span>
        </h3>
        <p className="text-xs text-muted-foreground mt-1">绿色表示新增，红色表示删除，黄色表示修改</p>
      </div>

      <div className="divide-y divide-border">
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
        return 'bg-green-500/10 hover:bg-green-500/20';
      case 'delete':
        return 'bg-red-500/10 hover:bg-red-500/20';
      case 'modify':
        return 'bg-amber-500/10 hover:bg-amber-500/20';
      default:
        return 'bg-background hover:bg-muted/50';
    }
  };

  const getPrefix = () => {
    switch (change.type) {
      case 'add':
        return '+';
      case 'delete':
        return '-';
      case 'modify':
        return '~';
      default:
        return ' ';
    }
  };

  const getPrefixColor = () => {
    switch (change.type) {
      case 'add':
        return 'text-green-600 dark:text-green-400';
      case 'delete':
        return 'text-red-600 dark:text-red-400';
      case 'modify':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div
      className={cn('flex transition-colors duration-150', getLineStyle())}
      id={`change-${index}`}
    >
      {/* Line numbers */}
      <div className="flex-shrink-0 flex gap-2 px-2 py-2 bg-muted/30 text-muted-foreground select-none min-w-[100px] border-r border-border/10">
        <span className="w-10 text-right">{change.oldLine || ''}</span>
        <span className="w-10 text-right">{change.newLine || ''}</span>
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
              <span className="text-red-600 dark:text-red-400 font-bold">-</span>
              <span className="line-through text-red-600/70 dark:text-red-400/70">{change.oldContent}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">+</span>
              <span className="text-green-700 dark:text-green-300 font-semibold">{change.newContent}</span>
            </div>
          </div>
        ) : (
          <span className={change.type !== 'unchanged' ? 'font-medium' : ''}>
            {change.oldContent || change.newContent}
          </span>
        )}
      </div>
    </div>
  );
});

DiffLine.displayName = 'DiffLine';
