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
    <div className={cn('border border-border rounded-xl overflow-hidden flex flex-col bg-card shadow-xl shadow-foreground/5 dark:shadow-none', className)}>
      {/* Header */}
      <div className="bg-card p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg font-sans">左右对比模式</h3>
          <p className="text-xs text-muted-foreground mt-1 font-sans">左侧为旧版本，右侧为新版本 (智能对齐)</p>
        </div>
      </div>

      {/* Header Columns */}
      <div className="grid grid-cols-[1fr_50px_1fr] divide-x divide-border/40 border-b border-border text-[11px] font-bold uppercase tracking-widest bg-muted/30">
          <div className="px-6 py-3 text-red-600/70 dark:text-red-400/80">旧版本 (Source)</div>
          <div className="bg-muted/50"></div>
          <div className="px-6 py-3 text-green-700/80 dark:text-green-400/80">新版本 (Target)</div>
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
        <div className="grid grid-cols-[1fr_50px_1fr] divide-x divide-border/30 border-b border-border/10 min-h-[36px] hover:bg-muted/10 transition-colors group" id={`chunk-${index}`}>

            {/* Left Side (Old) */}
            <div className={cn(
                "relative flex items-stretch",
                group.type === 'delete' && "bg-red-50/20 dark:bg-red-500/5",
                group.type === 'modify' && "bg-amber-50/20 dark:bg-amber-500/5"
            )}>
                {/* Line Number Gutter */}
                <div className="w-10 flex-shrink-0 bg-muted/10 dark:bg-card text-muted-foreground/30 text-[9px] flex items-center justify-center border-r border-border/20 select-none font-mono font-medium">
                    {group.oldLine || ""}
                </div>
                {/* Content */}
                <div className={cn(
                    "flex-1 p-4 font-mono text-[13px] break-words whitespace-pre-wrap leading-[1.8]",
                    (group.type === 'delete' || group.type === 'modify') ? "text-foreground font-medium" : "text-muted-foreground/40",
                    group.type === 'add' && "opacity-0 select-none"
                )}>
                    {group.type !== 'add' && (group.type === 'modify' ? highlightCharacterDiff(group.oldContent, group.newContent, 'old') : group.oldContent)}
                </div>
            </div>

            {/* Central Gutter (FlowIndicator) */}
            <div className="relative bg-muted/5 flex items-center justify-center overflow-hidden">
                <GutterVisualization type={group.type} />
            </div>

            {/* Right Side (New) */}
            <div className={cn(
                "relative flex items-stretch",
                group.type === 'add' && "bg-green-50/20 dark:bg-green-500/5",
                group.type === 'modify' && "bg-amber-50/20 dark:bg-amber-500/5"
            )}>
                 {/* Line Number Gutter */}
                 <div className="w-10 flex-shrink-0 bg-muted/10 dark:bg-card text-muted-foreground/30 text-[9px] flex items-center justify-center border-r border-border/20 select-none font-mono font-medium">
                    {group.newLine || ""}
                </div>
                {/* Content */}
                <div className={cn(
                    "flex-1 p-4 font-mono text-[13px] break-words whitespace-pre-wrap leading-[1.8]",
                     (group.type === 'add' || group.type === 'modify') ? "text-foreground font-bold" : "text-muted-foreground/40",
                     group.type === 'delete' && "opacity-0 select-none"
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
          <mark key={i} className="bg-red-100 text-red-800 font-bold rounded px-0.5 border border-red-200">
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
          <mark key={i} className="bg-green-100 text-green-900 font-bold rounded px-0.5 border border-green-200 shadow-sm">
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
