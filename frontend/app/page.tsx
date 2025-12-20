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
  AlertCircle,
  Globe
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
import { DiffResultViewer } from '@/components/diff/DiffResultViewer';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

export default function Home() {
  const [oldText, setOldText] = useState('');
  const [newText, setNewText] = useState('');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('article-structure');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  // Advanced Settings
  const [alignThreshold, setAlignThreshold] = useState(0.6);
  const [formatText, setFormatText] = useState(false);
  const [showIdentical, setShowIdentical] = useState(true);
  const [minSimilarity, setMinSimilarity] = useState(0);
  const [maxSimilarity, setMaxSimilarity] = useState(1);
  const [invertSimilarity, setInvertSimilarity] = useState(false);

  // Localization Helper
  const t = useCallback((key: string) => {
    const dict: Record<string, Record<string, string>> = {
      zh: {
        title: '法律条文智能比对',
        subtitle: '基于 NLP 与 AST 及其精确的法条变更分析工具',
        reset: '重置',
        load_example: '加载示例',
        source_label: '旧版本文本 (Source)',
        target_label: '新版本文本 (Target)',
        source_placeholder: '粘贴旧版法律条文...',
        target_placeholder: '粘贴新版法律条文...',
        analyzing: '分析中...',
        start_compare: '开始比对分析',
        git_mode: 'Git行视图',
        split_view: '分屏视图',
        structure_view: '结构化视图',
        no_structure_data: '未检测到结构化数据，请尝试调整对比设置或重新分析',
        nav_title: '变更导航',
        stats_added: '新增',
        stats_deleted: '删除',
        stats_modified: '修改',
        stats_unchanged: '未变',
        entities_title: '识别的实体',
        no_entities: '未检测到关键法律实体',
        check_similarity: '相似度',
        settings_title: '对比设置',
        settings_adv_title: '高级对比设置',
        settings_desc: '调整算法参数以优化法律文本的结构化对比效果。',
        settings_sensitivity: '对齐敏感度',
        settings_sensitivity_desc: '控制判定两个条款为"修改"还是"不同"的相似度阈值。值越高，算法越倾向于认为它们是不同的条款（拆分/新增）。',
        settings_format: '智能格式化',
        settings_format_desc: '预处理文本，确保每一条/款都在单独一行，提升对比准确度。',
        settings_show_identical: '显示相同条款',
        settings_show_identical_desc: '在对比视图中包含未变更的条款。关闭以专注于差异。'
      },
      en: {
        title: 'Legal Text Comparison',
        subtitle: 'Precise analysis tool based on NLP & AST',
        reset: 'Reset',
        load_example: 'Load Example',
        source_label: 'Source Text (Old)',
        target_label: 'Target Text (New)',
        source_placeholder: 'Paste old legal text here...',
        target_placeholder: 'Paste new legal text here...',
        analyzing: 'Analyzing...',
        start_compare: 'Start Comparison',
        git_mode: 'Git View',
        split_view: 'Split View',
        structure_view: 'Structure Pro',
        no_structure_data: 'No structural data detected. Try adjusting settings.',
        nav_title: 'Navigation',
        stats_added: 'Added',
        stats_deleted: 'Deleted',
        stats_modified: 'Modified',
        stats_unchanged: 'Unchanged',
        entities_title: 'Detected Entities',
        no_entities: 'No key legal entities detected',
        check_similarity: 'Similarity',
        settings_title: 'Settings',
        settings_adv_title: 'Advanced Settings',
        settings_desc: 'Adjust algorithmic parameters to optimize legal text structural comparison.',
        settings_sensitivity: 'Alignment Sensitivity',
        settings_sensitivity_desc: 'Controls the similarity threshold for "Modify" vs "Different". Higher values make the algorithm stricter, preferring split/added types.',
        settings_format: 'Smart Formatting',
        settings_format_desc: 'Pre-process text to ensure each article/clause is on a single line for better accuracy.',
        settings_show_identical: 'Show Unchanged',
        settings_show_identical_desc: 'Include unchanged articles in the comparison view. Disable to focus on differences.'
      }
    };
    return dict[language][key] || key;
  }, [language]);

  const handleCompare = async () => {
    if (!oldText && !newText) return;

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      // Determine what to fetch based on current view, but default to Git for speed
      const type = viewMode === 'article-structure' ? 'structure' : 'git';

      const result = await compareLegalTextsAsync(oldText, newText, {
        alignThreshold,
        formatText,
        detectEntities: false,
        minSimilarity,
        maxSimilarity,
        invertSimilarity,
        type: type
      });

      setDiffResult(result);
    } catch (error) {
      console.error("Comparison failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Lazy load structural data if not present when switching views
  useEffect(() => {
    const lazyLoadStructure = async () => {
        if (viewMode === 'article-structure' && diffResult && !diffResult.articleChanges && !loading) {
            setLoading(true);
            try {
                const result = await compareLegalTextsAsync(oldText, newText, {
                    alignThreshold,
                    formatText,
                    detectEntities: false,
                    minSimilarity,
                    maxSimilarity,
                    invertSimilarity,
                    type: 'structure'
                });
                setDiffResult(prev => prev ? { ...prev, articleChanges: result.articleChanges } : result);
            } catch (err) {
                console.error("Lazy load structure failed:", err);
            } finally {
                setLoading(false);
            }
        }

        if ((viewMode === 'git' || viewMode === 'sidebyside') && diffResult && diffResult.changes.length === 0 && !loading) {
             setLoading(true);
             try {
                const result = await compareLegalTextsAsync(oldText, newText, {
                    alignThreshold,
                    formatText,
                    detectEntities: false,
                    type: 'git'
                });
                setDiffResult(prev => prev ? { ...prev, changes: result.changes, stats: result.stats } : result);
             } catch (err) {
                console.error("Lazy load git diff failed:", err);
             } finally {
                setLoading(false);
             }
        }
    };

    lazyLoadStructure();
  }, [viewMode, diffResult, oldText, newText, alignThreshold, formatText]);

  const clearInputs = () => {
    setOldText('');
    setNewText('');
    setDiffResult(null);
  };

  const handleSwap = async () => {
    const tempOld = oldText;
    const tempNew = newText;
    setOldText(tempNew);
    setNewText(tempOld);

    if (!tempOld && !tempNew) return;

    // Automatically trigger comparison with swapped values
    setLoading(true);
    try {
      const type = viewMode === 'article-structure' ? 'structure' : 'git';
      const result = await compareLegalTextsAsync(tempNew, tempOld, {
        alignThreshold,
        formatText,
        detectEntities: false,
        minSimilarity,
        maxSimilarity,
        invertSimilarity,
        type: type
      });
      setDiffResult(result);
    } catch (error) {
      console.error("Swap-comparison failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const useExample = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/examples');
      if (!response.ok) throw new Error('Failed to fetch examples');

      const data = await response.json();
      setOldText(data.old_text);
      setNewText(data.new_text);
    } catch (error) {
      console.error("Failed to load examples:", error);
      alert("无法加载示例数据，请确保后端服务正常运行。");
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to results when ready
  useEffect(() => {
    if (diffResult) {
      setTimeout(() => {
        const resultsElement = document.getElementById('results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [diffResult]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary relative font-sans">

      {/* Background Ambience */}
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <main className="relative z-10 container mx-auto p-4 lg:p-8 space-y-8 max-w-[98%]">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl ring-1 ring-primary/20">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                {t('title')}
              </h1>
            </div>
            <p className="text-muted-foreground pl-14">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 pl-14 md:pl-0">
             <ThemeToggle />
             <Button
               variant="outline"
               size="icon"
               className="font-black text-[10px] flex items-center justify-center transition-all bg-muted hover:bg-primary/10"
               onClick={() => setLanguage(prev => prev === 'zh' ? 'en' : 'zh')}
               title={language === 'zh' ? 'Switch to English' : '切换为中文'}
             >
               {language === 'zh' ? (
                 <span className="animate-in fade-in zoom-in duration-300">EN</span>
               ) : (
                 <span className="animate-in fade-in zoom-in duration-300 text-[12px]">中</span>
               )}
               <span className="sr-only">Toggle Language</span>
             </Button>
             <Button variant="outline" onClick={clearInputs} className="gap-2">
               <RotateCcw className="w-4 h-4" /> {t('reset')}
             </Button>
             <Button variant="outline" onClick={useExample} className="gap-2" disabled={loading}>
                 {loading ? <Zap className="w-4 h-4 animate-spin" /> : <GitCommit className="w-4 h-4" />}
                 {t('load_example')}
             </Button>
          </div>
        </header>

        {/* Input Area */}
        <section className="relative grid md:grid-cols-2 gap-6">
          <Card className="glass-card border-l-4 border-l-red-500/50 shadow-sm hover:shadow-md transition-shadow">
             <CardHeader className="pb-3">
               <CardTitle className="flex items-center gap-2 text-base font-medium">
                 <span className="w-2 h-2 rounded-full bg-red-500"></span>
                 {t('source_label')}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <Textarea
                 value={oldText}
                 onChange={(e) => setOldText(e.target.value)}
                 placeholder={t('source_placeholder')}
                 className="min-h-[280px] font-mono text-sm leading-relaxed resize-none bg-background/50 focus:bg-background transition-colors border-none ring-1 ring-border shadow-inner"
               />
             </CardContent>
          </Card>

          {/* Central Swap Button (Desktop) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex">
             <Button
               variant="outline"
               size="icon"
               className="rounded-full w-12 h-12 shadow-xl bg-background border-primary/20 hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all active:scale-95 group"
               onClick={handleSwap}
               disabled={loading}
               title="Swap Original & Target"
             >
               <ArrowRightLeft className={cn("w-5 h-5 transition-transform group-hover:rotate-180", loading && "animate-spin")} />
             </Button>
          </div>

          <Card className="glass-card border-l-4 border-l-green-500/50 shadow-sm hover:shadow-md transition-shadow">
             <CardHeader className="pb-3">
               <CardTitle className="flex items-center gap-2 text-base font-medium">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 {t('target_label')}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <Textarea
                 value={newText}
                 onChange={(e) => setNewText(e.target.value)}
                 placeholder={t('target_placeholder')}
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
                <Zap className="w-4 h-4 animate-spin" /> {t('analyzing')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" /> {t('start_compare')}
              </span>
            )}
          </Button>
        </div>

        {/* Results Area */}
        <AnimatePresence mode="wait">
          {diffResult && (
            <DiffResultViewer
               diffResult={diffResult}
               viewMode={viewMode}
               setViewMode={setViewMode}
               language={language}
               alignThreshold={alignThreshold}
               setAlignThreshold={setAlignThreshold}
               formatText={formatText}
               setFormatText={setFormatText}
               showIdentical={showIdentical}
               setShowIdentical={setShowIdentical}
               minSimilarity={minSimilarity}
               setMinSimilarity={setMinSimilarity}
               maxSimilarity={maxSimilarity}
               setMaxSimilarity={setMaxSimilarity}
               invertSimilarity={invertSimilarity}
               setInvertSimilarity={setInvertSimilarity}
               loading={loading}
               t={t}
            />
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
