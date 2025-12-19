'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Change } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChevronRight, Plus, Minus, Edit3 } from 'lucide-react';

interface AnchorNavigationProps {
  changes: Change[];
  className?: string;
}

export default function AnchorNavigation({ changes, className }: AnchorNavigationProps) {
  // Filter out unchanged items for navigation
  const significantChanges = changes.filter(c => c.type !== 'unchanged');

  const scrollToChange = (index: number) => {
    const element = document.getElementById(`change-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight effect
      element.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
      }, 2000);
    }
  };

  const getChangeIcon = (type: Change['type']) => {
    switch (type) {
      case 'add':
        return <Plus className="w-3 h-3" />;
      case 'delete':
        return <Minus className="w-3 h-3" />;
      case 'modify':
        return <Edit3 className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getChangeColor = (type: Change['type']) => {
    switch (type) {
      case 'add':
        return 'text-green-700 dark:text-green-300 bg-green-500/10 hover:bg-green-500/20 border-green-500/10';
      case 'delete':
        return 'text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 border-red-500/10';
      case 'modify':
        return 'text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/10';
      default:
        return 'text-muted-foreground hover:bg-muted/50';
    }
  };

  const getChangeLabel = (type: Change['type']) => {
    switch (type) {
      case 'add':
        return '新增';
      case 'delete':
        return '删除';
      case 'modify':
        return '修改';
      default:
        return '未变';
    }
  };

  return (
    <div className={cn('glass-card rounded-xl overflow-hidden border-border/40', className)}>
      {/* Header */}
      <div className="bg-muted/30 px-4 py-3 border-b border-border/10">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          变更导航
          <span className="ml-auto text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-md">
            {significantChanges.length} 处变更
          </span>
        </h3>
      </div>

      {/* Mini-map */}
      <div className="px-4 py-3 border-b border-border/10 bg-background/20 backdrop-blur-[2px]">
        <div className="flex gap-px h-8 rounded-md overflow-hidden bg-muted/20 p-1">
          {changes.map((change, index) => {
            if (change.type === 'unchanged') {
              return (
                <div
                  key={index}
                  className="flex-1 bg-muted/30 rounded-[1px]"
                  style={{ minWidth: '2px' }}
                />
              );
            }
            return (
              <button
                key={index}
                onClick={() => scrollToChange(index)}
                className={cn(
                  'flex-1 rounded-[1px] transition-all hover:scale-110 hover:z-10',
                  change.type === 'add' && 'bg-green-500',
                  change.type === 'delete' && 'bg-red-500',
                  change.type === 'modify' && 'bg-amber-500'
                )}
                style={{ minWidth: '3px' }}
                title={`${getChangeLabel(change.type)} - 第 ${change.oldLine || change.newLine} 行`}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center opacity-70">
          点击色块快速定位
        </p>
      </div>

      {/* Change list */}
      <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
        {significantChanges.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 opacity-50" />
            </span>
            没有发现差异
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {significantChanges.map((change, idx) => {
              const originalIndex = changes.indexOf(change);
              return (
                <motion.button
                  key={originalIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.03 }}
                  onClick={() => scrollToChange(originalIndex)}
                  className={cn(
                    'w-full px-4 py-3 flex items-start gap-3 transition-all text-left border-l-2 border-transparent hover:border-l-primary/50',
                    getChangeColor(change.type)
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getChangeIcon(change.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {getChangeLabel(change.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        行 {change.oldLine || change.newLine}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-2 font-mono">
                      {change.oldContent || change.newContent}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
