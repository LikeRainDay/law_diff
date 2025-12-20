'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitCommit, LayoutTemplate, FileDiff, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { DiffResult, ViewMode } from '@/lib/types';
import GitDiffView from './GitDiffView';
import SideBySideView from './SideBySideView';
import { AlignedArticleView } from './AlignedArticleView';
import AnchorNavigation from './AnchorNavigation';
import EntityHighlight from '@/components/legal/EntityHighlight';
import { ComparisonSettings } from './ComparisonSettings';
import { cn } from '@/lib/utils';

interface DiffResultViewerProps {
  diffResult: DiffResult;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  language: 'zh' | 'en';
  alignThreshold: number;
  setAlignThreshold: (v: number) => void;
  formatText: boolean;
  setFormatText: (v: boolean) => void;
  showIdentical: boolean;
  setShowIdentical: (v: boolean) => void;
  minSimilarity: number;
  setMinSimilarity: (v: number) => void;
  maxSimilarity: number;
  setMaxSimilarity: (v: number) => void;
  invertSimilarity: boolean;
  setInvertSimilarity: (v: boolean) => void;
  loading?: boolean;
  t: (key: string) => string;
}

export const DiffResultViewer = React.memo(({
  diffResult,
  viewMode,
  setViewMode,
  language,
  alignThreshold,
  setAlignThreshold,
  formatText,
  setFormatText,
  showIdentical,
  setShowIdentical,
  minSimilarity,
  setMinSimilarity,
  maxSimilarity,
  setMaxSimilarity,
  invertSimilarity,
  setInvertSimilarity,
  loading = false,
  t
}: DiffResultViewerProps) => {
  // Compute stats for structure view
  const displayStats = useMemo(() => {
    if (viewMode === 'article-structure' && diffResult.articleChanges) {
      const stats = {
        additions: 0,
        deletions: 0,
        modifications: 0,
        unchanged: 0
      };

      diffResult.articleChanges.forEach(change => {
        switch (change.type) {
          case 'added':
            stats.additions++;
            break;
          case 'deleted':
            stats.deletions++;
            break;
          case 'modified':
          case 'renumbered':
          case 'split':
          case 'merged':
          case 'moved':
          case 'replaced':
            stats.modifications++;
            break;
          case 'unchanged':
            stats.unchanged++;
            break;
        }
      });

      return stats;
    }

    return diffResult.stats;
  }, [viewMode, diffResult.articleChanges, diffResult.stats]);

  return (
    <motion.div
      id="results-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Toolbar */}
      <div className="rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-40 bg-white dark:bg-card border border-border shadow-md transition-all duration-300">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === 'article-structure' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('article-structure')}
            className="gap-2 relative"
          >
            <FileDiff className="w-4 h-4" />
            {t('structure_view')}
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
          </Button>
          <Button
            variant={viewMode === 'git' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('git')}
            className="gap-2"
          >
            <GitCommit className="w-4 h-4" /> {t('git_mode')}
          </Button>
          <Button
            variant={viewMode === 'sidebyside' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('sidebyside')}
            className="gap-2"
          >
            <LayoutTemplate className="w-4 h-4" /> {t('split_view')}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <ComparisonSettings
            threshold={alignThreshold}
            onThresholdChange={setAlignThreshold}
            formatText={formatText}
            onFormatTextChange={setFormatText}
            showIdentical={showIdentical}
            onShowIdenticalChange={setShowIdentical}
            minSimilarity={minSimilarity}
            onMinSimilarityChange={setMinSimilarity}
            maxSimilarity={maxSimilarity}
            onMaxSimilarityChange={setMaxSimilarity}
            invertSimilarity={invertSimilarity}
            onInvertSimilarityChange={setInvertSimilarity}
            language={language}
          />
          <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold border border-primary/20">
            <CheckCircle2 className="w-4 h-4" />
            {t('check_similarity')} {(diffResult.similarity * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Main Viewer */}
        <div className="lg:col-span-9 order-2 lg:order-1">
      <Card className="overflow-hidden min-h-[850px] bg-white dark:bg-card/40 border-border/40 shadow-xl">
            <CardContent className="p-0 relative">
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl"
                  >
                    <div className="flex flex-col items-center gap-4 bg-card p-8 rounded-2xl shadow-2xl border border-primary/20">
                      <div className="relative">
                        <Zap className="w-10 h-10 text-primary animate-pulse" />
                        <div className="absolute inset-0 w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      </div>
                      <p className="text-base font-semibold text-primary animate-pulse">
                        {t('analyzing')}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {viewMode === 'git' && (
                    <div className="p-4">
                      <GitDiffView changes={diffResult.changes} />
                    </div>
                  )}

                  {viewMode === 'sidebyside' && (
                    <div className="p-4">
                      <SideBySideView changes={diffResult.changes} />
                    </div>
                  )}

                  {viewMode === 'article-structure' && (
                    <div className="p-6">
                      {diffResult.articleChanges ? (
                        <AlignedArticleView
                          changes={diffResult.articleChanges}
                          showIdentical={showIdentical}
                          language={language}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
                          <AlertCircle className="w-12 h-12 opacity-20" />
                          <p>{t('no_structure_data')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <div className="sticky top-24 space-y-6">
            {/* Mini Map */}
            <Card className="glass-card shadow-md">
              <CardHeader className="py-3 px-4 border-b border-border/10">
                <CardTitle className="text-sm font-medium">{t('nav_title')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <AnchorNavigation
                  changes={diffResult.changes}
                  articleChanges={diffResult.articleChanges}
                  viewMode={viewMode}
                  className="max-h-[40vh] overflow-y-auto"
                  language={language}
                />
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-green-500/5 border-green-500/20 shadow-sm transition-all hover:bg-green-500/10">
                <div className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {displayStats.additions}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('stats_added')}</div>
                </div>
              </Card>
              <Card className="bg-red-500/5 border-red-500/20 shadow-sm transition-all hover:bg-red-500/10">
                <div className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {displayStats.deletions}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('stats_deleted')}</div>
                </div>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/20 shadow-sm transition-all hover:bg-amber-500/10">
                <div className="p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {displayStats.modifications}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('stats_modified')}</div>
                </div>
              </Card>
              <Card className="bg-blue-500/5 border-blue-500/20 shadow-sm transition-all hover:bg-blue-500/10">
                <div className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {displayStats.unchanged}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('stats_unchanged')}</div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

DiffResultViewer.displayName = 'DiffResultViewer';
