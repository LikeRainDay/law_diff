'use client';

import React from 'react';
import { Change } from '@/lib/types';
import { cn } from '@/lib/utils';
import * as DiffMatchPatch from 'diff-match-patch';

interface SideBySideViewProps {
  changes: Change[];
  className?: string;
}

// [REFACTORED] SideBySideView using Grid Rows for perfect alignment
export default function SideBySideView({ changes, className }: SideBySideViewProps) {
  // Group changes into lines for side-by-side display
  const lineGroups = React.useMemo(() => groupChangesForSideBySide(changes), [changes]);

  return (
    <div className={cn('border rounded-lg overflow-hidden flex flex-col', className)}>
      {/* Header */}
      <div className="bg-muted/40 p-4 border-b border-border/10 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">左右对比模式</h3>
          <p className="text-xs text-muted-foreground mt-1">左侧为旧版本，右侧为新版本 (自动对齐)</p>
        </div>
      </div>

      {/* Header Columns */}
      <div className="grid grid-cols-[1fr_50px_1fr] divide-x divide-border border-b border-border text-sm font-medium">
          <div className="bg-red-500/10 px-4 py-2 text-red-600 dark:text-red-400">旧版本</div>
          <div className="bg-muted/30"></div>
          <div className="bg-green-500/10 px-4 py-2 text-green-600 dark:text-green-400">新版本</div>
      </div>

      {/* Scrollable Content Area */}
      <div className="overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div className="flex flex-col">
              {lineGroups.map((group, index) => (
                  <SideBySideRow key={index} group={group} index={index} />
              ))}
          </div>
      </div>
    </div>
  );
}

// Single Row Component ensures heights match perfectly
const SideBySideRow = React.memo(({ group, index }: { group: any, index: number }) => {
    return (
        <div className="grid grid-cols-[1fr_50px_1fr] divide-x divide-border border-b border-border/40 min-h-[32px] hover:bg-muted/5 transition-colors group" id={`chunk-${index}`}>

            {/* Left Side (Old) */}
            <div className={cn(
                "relative flex items-stretch",
                group.type === 'delete' && "bg-red-500/10",
                group.type === 'modify' && "bg-amber-500/10"
            )}>
                {/* Line Number */}
                <div className="w-10 flex-shrink-0 bg-muted/20 text-muted-foreground text-[10px] flex items-center justify-center border-r border-border/10 select-none">
                    {group.oldLine || ""}
                </div>
                {/* Content */}
                <div className={cn(
                    "flex-1 p-2 font-mono text-xs break-all whitespace-pre-wrap",
                    (group.type === 'delete' || group.type === 'modify') && "text-slate-700 dark:text-slate-300",
                    group.type === 'add' && "opacity-0 select-none" // Empty slot for added line
                )}>
                    {group.type !== 'add' && (group.type === 'modify' ? highlightCharacterDiff(group.oldContent, group.newContent, 'old') : group.oldContent)}
                </div>
            </div>

            {/* Central Gutter (Visual Flow) */}
            <div className="relative bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                <GutterVisualization type={group.type} />
            </div>

            {/* Right Side (New) */}
            <div className={cn(
                "relative flex items-stretch",
                group.type === 'add' && "bg-green-500/10",
                group.type === 'modify' && "bg-amber-500/10"
            )}>
                 {/* Line Number */}
                 <div className="w-10 flex-shrink-0 bg-muted/20 text-muted-foreground text-[10px] flex items-center justify-center border-r border-border/10 select-none">
                    {group.newLine || ""}
                </div>
                {/* Content */}
                <div className={cn(
                    "flex-1 p-2 font-mono text-xs break-all whitespace-pre-wrap",
                     (group.type === 'add' || group.type === 'modify') && "text-slate-800 dark:text-slate-200",
                     group.type === 'delete' && "opacity-0 select-none" // Empty slot for deleted line
                )}>
                    {group.type !== 'delete' && (group.type === 'modify' ? highlightCharacterDiff(group.oldContent, group.newContent, 'new') : group.newContent)}
                </div>
            </div>
        </div>
    );
});

SideBySideRow.displayName = 'SideBySideRow';

const GutterVisualization = React.memo(({ type }: { type: string }) => {
    if (type === 'unchanged') return null;

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {type === 'modify' && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-amber-200 dark:text-amber-800/40 fill-current opacity-60">
                     <path d="M0,0 L100,0 L100,100 L0,100 Z" />
                </svg>
            )}
            {type === 'add' && (
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-green-200 dark:text-green-800/40 fill-current opacity-60">
                     <path d="M50,0 L100,0 L100,100 L50,100 L0,50 Z" />
                </svg>
            )}
            {type === 'delete' && (
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-red-200 dark:text-red-800/40 fill-current opacity-60">
                     <path d="M0,0 L50,0 L100,50 L50,100 L0,100 Z" />
                </svg>
            )}
        </div>
    );
});

GutterVisualization.displayName = 'GutterVisualization';


// Character-level diff highlighting using diff-match-patch
function highlightCharacterDiff(text1: string, text2: string, side: 'old' | 'new'): React.ReactNode {
  const dmp = new DiffMatchPatch.diff_match_patch();
  const diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map((diff, i) => {
    const [type, text] = diff;

    if (side === 'old') {
      // Old side: highlight deletions in red
      if (type === -1) {
        return (
          <mark key={i} className="bg-red-500/30 text-red-900 dark:text-red-100 rounded px-0.5">
            {text}
          </mark>
        );
      } else if (type === 1) {
        // Skip additions on old side
        return null;
      }
    } else {
      // New side: highlight additions in green
      if (type === 1) {
        return (
          <mark key={i} className="bg-green-500/30 text-green-900 dark:text-green-100 rounded px-0.5">
            {text}
          </mark>
        );
      } else if (type === -1) {
        // Skip deletions on new side
        return null;
      }
    }

    return <span key={i}>{text}</span>;
  });
}

// Helper function to group changes for side-by-side display
function groupChangesForSideBySide(changes: Change[]) {
  const groups: Array<{
    oldContent?: string;
    newContent?: string;
    oldLine?: number;
    newLine?: number;
    type: 'add' | 'delete' | 'modify' | 'unchanged';
  }> = [];

  changes.forEach((change) => {
    if (change.type === 'modify') {
      groups.push({
        oldContent: change.oldContent,
        newContent: change.newContent,
        oldLine: change.oldLine,
        newLine: change.newLine,
        type: 'modify',
      });
    } else if (change.type === 'add') {
      groups.push({
        newContent: change.newContent,
        newLine: change.newLine,
        type: 'add',
      });
    } else if (change.type === 'delete') {
      groups.push({
        oldContent: change.oldContent,
        oldLine: change.oldLine,
        type: 'delete',
      });
    } else {
      groups.push({
        oldContent: change.oldContent,
        newContent: change.newContent,
        oldLine: change.oldLine,
        newLine: change.newLine,
        type: 'unchanged',
      });
    }
  });

  return groups;
}
