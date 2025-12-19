'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Change } from '@/lib/types';
import { cn } from '@/lib/utils';
import * as DiffMatchPatch from 'diff-match-patch';

interface SideBySideViewProps {
  changes: Change[];
  className?: string;
}

export default function SideBySideView({ changes, className }: SideBySideViewProps) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [syncScroll, setSyncScroll] = useState(true);

  // Synchronized scrolling
  useEffect(() => {
    if (!syncScroll) return;

    const leftDiv = leftRef.current;
    const rightDiv = rightRef.current;
    if (!leftDiv || !rightDiv) return;

    const handleLeftScroll = () => {
      if (rightDiv && syncScroll) {
        rightDiv.scrollTop = leftDiv.scrollTop;
      }
    };

    const handleRightScroll = () => {
      if (leftDiv && syncScroll) {
        leftDiv.scrollTop = rightDiv.scrollTop;
      }
    };

    leftDiv.addEventListener('scroll', handleLeftScroll);
    rightDiv.addEventListener('scroll', handleRightScroll);

    return () => {
      leftDiv.removeEventListener('scroll', handleLeftScroll);
      rightDiv.removeEventListener('scroll', handleRightScroll);
    };
  }, [syncScroll]);

  // Group changes into lines for side-by-side display
  const lineGroups = groupChangesForSideBySide(changes);

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-muted/40 p-4 border-b border-border/10 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">左右对比模式</h3>
          <p className="text-xs text-muted-foreground mt-1">左侧为旧版本，右侧为新版本</p>
        </div>
        <button
          onClick={() => setSyncScroll(!syncScroll)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            syncScroll
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          {syncScroll ? '同步滚动开启' : '同步滚动关闭'}
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Left side (old version) */}
        <div>
          <div className="bg-red-500/10 px-4 py-2 border-b border-border/50">
            <span className="text-sm font-medium text-red-600 dark:text-red-400">旧版本</span>
          </div>
          <div
            ref={leftRef}
            className="overflow-y-auto custom-scrollbar font-mono text-sm"
            style={{ maxHeight: '600px' }}
          >
            {lineGroups.map((group, index) => (
              <SideBySideLine
                key={`left-${index}`}
                content={group.oldContent}
                comparedContent={group.newContent}
                lineNumber={group.oldLine}
                type={group.type === 'add' ? 'empty' : group.type}
                side="old"
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Right side (new version) */}
        <div>
          <div className="bg-green-500/10 px-4 py-2 border-b border-border/50">
            <span className="text-sm font-medium text-green-600 dark:text-green-400">新版本</span>
          </div>
          <div
            ref={rightRef}
            className="overflow-y-auto custom-scrollbar font-mono text-sm"
            style={{ maxHeight: '600px' }}
          >
            {lineGroups.map((group, index) => (
              <SideBySideLine
                key={`right-${index}`}
                content={group.newContent}
                comparedContent={group.oldContent}
                lineNumber={group.newLine}
                type={group.type === 'delete' ? 'empty' : group.type}
                side="new"
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SideBySideLineProps {
  content?: string;
  comparedContent?: string;
  lineNumber?: number;
  type: 'add' | 'delete' | 'modify' | 'unchanged' | 'empty';
  side: 'old' | 'new';
  index: number;
}

function SideBySideLine({ content, comparedContent, lineNumber, type, side, index }: SideBySideLineProps) {
  const getLineStyle = () => {
    switch (type) {
      case 'add':
        return 'bg-green-500/10 hover:bg-green-500/20';
      case 'delete':
        return 'bg-red-500/10 hover:bg-red-500/20';
      case 'modify':
        return 'bg-amber-500/10 hover:bg-amber-500/20';
      case 'empty':
        return 'bg-muted/20';
      default:
        return 'bg-background hover:bg-muted/50';
    }
  };

  if (type === 'empty') {
    return (
      <div className={cn('flex min-h-[32px] border-b border-border/50', getLineStyle())}>
        <div className="flex-shrink-0 w-12 px-2 py-1 bg-muted/20 text-muted-foreground text-right select-none border-r border-border/10">
        </div>
        <div className="flex-1 px-3 py-1"></div>
      </div>
    );
  }

  // Character-level diff highlighting for modify type
  let displayContent: React.ReactNode = content;

  if (type === 'modify' && content && comparedContent) {
    displayContent = highlightCharacterDiff(
      side === 'old' ? content : comparedContent,
      side === 'old' ? comparedContent : content,
      side
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: index * 0.005 }}
      className={cn('flex min-h-[32px] border-b border-border/50 transition-colors', getLineStyle())}
      id={`line-${index}`}
    >
      {/* Line number */}
      <div className="flex-shrink-0 w-12 px-2 py-1 bg-muted/30 text-muted-foreground text-right select-none text-xs border-r border-border/10">
        {lineNumber}
      </div>

      {/* Content */}
      <div className={cn(
        'flex-1 px-3 py-1 whitespace-pre-wrap break-words text-foreground',
        (type === 'add' || type === 'delete' || type === 'modify') && 'font-medium'
      )}>
        {type === 'modify' ? displayContent : content}
      </div>
    </motion.div>
  );
}

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
