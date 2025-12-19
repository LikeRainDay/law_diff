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

      {/* Content Area (Infinite Height) */}
      <div className="bg-background">
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
        <div className="grid grid-cols-[1fr_50px_1fr] divide-x divide-border/60 border-b border-border/30 min-h-[32px] hover:bg-muted/30 transition-colors group" id={`chunk-${index}`}>

            {/* Left Side (Old) */}
            <div className={cn(
                "relative flex items-stretch",
                group.type === 'delete' && "bg-red-500/[0.04]",
                group.type === 'modify' && "bg-amber-500/[0.04]"
            )}>
                {/* Line Number */}
                <div className="w-12 flex-shrink-0 bg-muted/40 text-muted-foreground text-[10px] flex items-center justify-center border-r border-border/10 select-none font-mono">
                    {group.oldLine || ""}
                </div>
                {/* Content */}
                <div className={cn(
                    "flex-1 p-3 font-mono text-[13px] break-words whitespace-pre-wrap leading-relaxed",
                    (group.type === 'delete' || group.type === 'modify') ? "text-foreground" : "text-muted-foreground/70",
                    group.type === 'add' && "opacity-0 select-none" // Empty slot for added line
                )}>
                    {group.type !== 'add' && (group.type === 'modify' ? highlightCharacterDiff(group.oldContent, group.newContent, 'old') : group.oldContent)}
                </div>
            </div>

            {/* Central Gutter (Visual Flow) */}
            <div className="relative bg-muted/20 flex items-center justify-center overflow-hidden border-x border-border/10">
                <GutterVisualization type={group.type} />
            </div>

            {/* Right Side (New) */}
            <div className={cn(
                "relative flex items-stretch",
                group.type === 'add' && "bg-green-500/[0.04]",
                group.type === 'modify' && "bg-amber-500/[0.04]"
            )}>
                 {/* Line Number */}
                 <div className="w-12 flex-shrink-0 bg-muted/40 text-muted-foreground text-[10px] flex items-center justify-center border-r border-border/10 select-none font-mono">
                    {group.newLine || ""}
                </div>
                {/* Content */}
                <div className={cn(
                    "flex-1 p-3 font-mono text-[13px] break-words whitespace-pre-wrap leading-relaxed",
                     (group.type === 'add' || group.type === 'modify') ? "text-foreground font-medium" : "text-muted-foreground/70",
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
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-amber-500/20 fill-current">
                     <path d="M0,0 L100,0 L100,100 L0,100 Z" />
                </svg>
            )}
            {type === 'add' && (
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-green-500/20 fill-current">
                     <path d="M50,0 L100,0 L100,100 L50,100 L0,50 Z" />
                </svg>
            )}
            {type === 'delete' && (
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-red-500/20 fill-current">
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
