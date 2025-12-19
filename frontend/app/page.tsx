'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRightLeft,
  FileDiff,
  GitCommit,
  LayoutTemplate,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { compareLegalTextsAsync } from '@/lib/diff-utils';
import { DiffResult, ViewMode } from '@/lib/types';
import GitDiffView from '@/components/diff/GitDiffView';
import SideBySideView from '@/components/diff/SideBySideView';
import AnchorNavigation from '@/components/diff/AnchorNavigation';
import EntityHighlight from '@/components/legal/EntityHighlight';
import { AlignedArticleView } from '@/components/diff/AlignedArticleView';
import { ComparisonSettings } from '@/components/diff/ComparisonSettings';
import { cn } from '@/lib/utils';

// Examples
// removed hardcoded examples

export default function Home() {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('git');

  // Advanced Settings
  const [alignThreshold, setAlignThreshold] = useState(0.6);
  const [formatText, setFormatText] = useState(true);
  const [showIdentical, setShowIdentical] = useState(true);

  // Initial comparison on mount - SKIP for now, let user choose
  // useEffect(() => {
  //   handleCompare();
  // }, []);

  const handleCompare = async () => {
    if (!oldText && !newText) return;

    setLoading(true);
    // Artificial delay for better UX
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const result = await compareLegalTextsAsync(oldText, newText, {
        alignThreshold,
        formatText,
        detectEntities: true
      });
      setDiffResult(result);

      // Auto-switch to structure view if structural changes detected
      if (result.articleChanges && result.articleChanges.length > 0) {
        setViewMode('article-structure');
      } else {
        setViewMode('git');
      }
    } catch (error) {
      console.error("Comparison failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearInputs = () => {
    setOldText('');
    setNewText('');
    setDiffResult(null);
  };

  const useExample = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/examples');
      if (!response.ok) throw new Error('Failed to fetch examples');

      const data = await response.json();
      setOldText(data.old_text);
      setNewText(data.new_text);

      // Auto trigger comparison after loading examples
      // We need to use the data directly since state update is async
      // Better to just let user click compare or useEffect but let's just load data for now
    } catch (error) {
      console.error("Failed to load examples:", error);
      alert("无法加载示例数据，请确保后端服务正常运行。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary relative font-sans">

      {/* Background Ambience */}
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <main className="relative z-10 container mx-auto p-6 lg:p-12 space-y-8 max-w-7xl">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl ring-1 ring-primary/20">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                法律条文智能比对
              </h1>
            </div>
            <p className="text-muted-foreground pl-14">
              基于 NLP 与 AST 及其精确的法条变更分析工具
            </p>
          </div>
          <div className="flex items-center gap-3 pl-14 md:pl-0">
             <ThemeToggle />
             <Button variant="outline" onClick={clearInputs} className="gap-2">
               <RotateCcw className="w-4 h-4" /> Reset
             </Button>
             <Button variant="outline" onClick={useExample} className="gap-2" disabled={loading}>
                 {loading ? <Zap className="w-4 h-4 animate-spin" /> : <GitCommit className="w-4 h-4" />}
                 Load Example
             </Button>
          </div>
        </header>

        {/* Input Area */}
        <section className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card border-l-4 border-l-red-500/50 shadow-sm hover:shadow-md transition-shadow">
             <CardHeader className="pb-3">
               <CardTitle className="flex items-center gap-2 text-base font-medium">
                 <span className="w-2 h-2 rounded-full bg-red-500"></span>
                 旧版本文本 (Source)
               </CardTitle>
             </CardHeader>
             <CardContent>
               <Textarea
                 value={oldText}
                 onChange={(e) => setOldText(e.target.value)}
                 placeholder="粘贴旧版法律条文..."
                 className="min-h-[280px] font-mono text-sm leading-relaxed resize-none bg-background/50 focus:bg-background transition-colors border-none ring-1 ring-border shadow-inner"
               />
             </CardContent>
          </Card>

          <Card className="glass-card border-l-4 border-l-green-500/50 shadow-sm hover:shadow-md transition-shadow">
             <CardHeader className="pb-3">
               <CardTitle className="flex items-center gap-2 text-base font-medium">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 新版本文本 (Target)
               </CardTitle>
             </CardHeader>
             <CardContent>
               <Textarea
                 value={newText}
                 onChange={(e) => setNewText(e.target.value)}
                 placeholder="粘贴新版法律条文..."
                 className="min-h-[280px] font-mono text-sm leading-relaxed resize-none bg-background/50 focus:bg-background transition-colors border-none ring-1 ring-border shadow-inner"
               />
             </CardContent>
          </Card>
        </section>

        {/* Action Bar */}
        <div className="flex justify-center py-4">
          <Button
            size="lg"
            onClick={handleCompare}
            disabled={loading}
            className="w-full md:w-auto min-w-[240px] h-12 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 animate-spin" /> 分析中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" /> 开始比对分析
              </span>
            )}
          </Button>
        </div>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {diffResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Toolbar */}
              <div className="glass-card rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-40 bg-background/80 backdrop-blur-md shadow-lg border border-border/50">
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  <Button
                    variant={viewMode === 'git' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('git')}
                    className="gap-2"
                  >
                    <GitCommit className="w-4 h-4" /> Git Mode
                  </Button>
                  <Button
                    variant={viewMode === 'sidebyside' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('sidebyside')}
                    className="gap-2"
                  >
                    <LayoutTemplate className="w-4 h-4" /> Split View
                  </Button>
                  <Button
                    variant={viewMode === 'article-structure' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('article-structure')}
                    className="gap-2 relative"
                  >
                    <FileDiff className="w-4 h-4" />
                    Structure Pro
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
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
                  />
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold border border-primary/20">
                     <CheckCircle2 className="w-4 h-4" />
                     Similarity {(diffResult.similarity * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

               <div className="grid lg:grid-cols-12 gap-6">
                 {/* Main Viewer */}
                 <div className="lg:col-span-9 order-2 lg:order-1">
                   <Card className="overflow-hidden min-h-[600px] bg-card/40 border-border/40 shadow-xl">
                     <CardContent className="p-0">
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
                              />
                            ) : (
                               <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-4">
                                  <AlertCircle className="w-12 h-12 opacity-20" />
                                  <p>未检测到结构化数据，请尝试调整对比设置或重新分析</p>
                               </div>
                            )}
                          </div>
                       )}
                     </CardContent>
                   </Card>
                 </div>

                 {/* Sidebar */}
                 <div className="lg:col-span-3 order-1 lg:order-2 space-y-6">
                   {/* Mini Map */}
                   <Card className="glass-card shadow-md">
                      <CardHeader className="py-3 px-4 border-b border-border/10">
                        <CardTitle className="text-sm font-medium">变更导航</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <AnchorNavigation
                          changes={diffResult.changes}
                          className="max-h-[400px]"
                        />
                      </CardContent>
                   </Card>

                   {/* Stats */}
                   <div className="grid grid-cols-2 gap-3">
                      <Card className="bg-green-500/5 border-green-500/20">
                         <div className="p-3 text-center">
                           <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                             {diffResult.stats.additions}
                           </div>
                           <div className="text-xs text-muted-foreground">新增</div>
                         </div>
                      </Card>
                      <Card className="bg-red-500/5 border-red-500/20">
                         <div className="p-3 text-center">
                           <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                             {diffResult.stats.deletions}
                           </div>
                           <div className="text-xs text-muted-foreground">删除</div>
                         </div>
                      </Card>
                      <Card className="bg-amber-500/5 border-amber-500/20">
                         <div className="p-3 text-center">
                           <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                             {diffResult.stats.modifications}
                           </div>
                           <div className="text-xs text-muted-foreground">修改</div>
                         </div>
                      </Card>
                      <Card className="bg-blue-500/5 border-blue-500/20">
                         <div className="p-3 text-center">
                           <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                             {diffResult.stats.unchanged}
                           </div>
                           <div className="text-xs text-muted-foreground">未变</div>
                         </div>
                      </Card>
                   </div>

                   {/* Entities */}
                   <Card className="glass-card overflow-hidden">
                     <CardHeader className="py-3 px-4 border-b border-border/10">
                       <CardTitle className="text-sm font-medium">识别的实体</CardTitle>
                     </CardHeader>
                     <CardContent className="p-0 max-h-[300px] overflow-y-auto custom-scrollbar">
                        <div className="divide-y divide-border/20">
<EntityHighlight entities={diffResult.entities} />
                          {diffResult.entities.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              未检测到关键法律实体
                            </div>
                          )}
                        </div>
                     </CardContent>
                   </Card>

                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
