'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, ArrowLeftRight, Sparkles, ChevronRight, Activity, Zap, Shield, Search, Copy, Check } from 'lucide-react';
import GitDiffView from '@/components/diff/GitDiffView';
import SideBySideView from '@/components/diff/SideBySideView';
import AnchorNavigation from '@/components/diff/AnchorNavigation';
import { ArticleChangeView } from '@/components/diff/ArticleChangeView';
import EntityHighlight from '@/components/legal/EntityHighlight';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { compareLegalTextsAsync, checkBackendHealth } from '@/lib/diff-utils';
import { DiffResult, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SITE_CONFIG } from '@/lib/constants';

// Sample legal text for demonstration
const SAMPLE_OLD_TEXT = `第一条 为了规范网络安全管理，保护网络信息安全，根据《中华人民共和国网络安全法》等法律法规，制定本办法。

第二条 本办法适用于在中华人民共和国境内从事网络运营、网络服务等活动的单位和个人。

第三条 网络运营者应当按照网络安全等级保护制度的要求，履行下列安全保护义务：
（一）建立和完善网络安全管理制度；
（二）采取技术措施，防范计算机病毒和网络攻击；
（三）对违法信息和不良信息进行监测和处理；
（四）保存网络日志不少于六个月。

第四条  违反本办法规定的，依法给予警告，可以并处一万元以上三万元以下罚款；情节严重的，处三万元以上十万元以下罚款。`;

const SAMPLE_NEW_TEXT = `第一条 为了规范网络安全管理，维护网络空间安全，保护网络信息安全和公民个人信息，根据《中华人民共和国网络安全法》《中华人民共和国数据安全法》等法律法规，制定本办法。

第二条 本办法适用于在中华人民共和国境内从事网络运营、网络服务、数据处理等活动的单位和个人。

第三条 网络运营者应当按照网络安全等级保护制度和数据分类分级保护制度的要求，履行下列安全保护义务：
（一）建立和完善网络安全和数据安全管理制度；
（二）采取技术措施和加密措施，防范计算机病毒、网络攻击和数据泄露；
（三）对违法信息和不良信息进行实时监测和及时处理；
（四）保存网络日志和操作记录不少于十二个月。

第四条 违反本办法规定的，依法给予警告，可以并处二万元以上五万元以下罚款；情节严重的，处五万元以上二十万元以下罚款，并可以责令暂停相关业务或者吊销许可证。`;

export default function Home() {
  const [oldText, setOldText] = useState(SAMPLE_OLD_TEXT);
  const [newText, setNewText] = useState(SAMPLE_NEW_TEXT);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('git');
  const [isComparing, setIsComparing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Dark mode handled by ThemeProvider


    // Check backend status periodically
    const checkStatus = async () => {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCompare = async () => {
    setIsComparing(true);
    try {
      // Use async backend comparison
      const result = await compareLegalTextsAsync(oldText, newText);
      setDiffResult(result);
    } catch (error) {
      console.error("Comparison failed", error);
    } finally {
      setIsComparing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-accent/30 selection:text-white relative font-sans">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.05]"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse-glow opacity-30"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] animate-float opacity-30"></div>
        <div className="scanline-overlay opacity-[0.03]"></div>
      </div>

      {/* Header */}
      <header className="glass border-b border-border/10 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-accent blur-md opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="relative w-10 h-10 bg-background/50 border border-border/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:border-accent/50 transition-colors">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <span className="text-foreground">Legale</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Mind</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center px-3 py-1.5 rounded-full border border-border/10 bg-muted/20 backdrop-blur-sm gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-500/80" />
                  <span className="text-xs font-medium text-muted-foreground">Rust Core</span>
                </div>
                <div className="w-[1px] h-3 bg-border/20"></div>
                <div className="flex items-center gap-2">
                  <Activity className={cn("w-3.5 h-3.5 transition-colors", backendOnline ? "text-green-500" : "text-red-500")} />
                  <span className={cn("text-xs font-medium transition-colors", backendOnline ? "text-green-500" : "text-red-500")}>
                    {backendOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {!diffResult ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="text-center space-y-6 py-12 md:py-16">
                <Badge variant="secondary" className="px-4 py-1.5 text-sm font-normal bg-accent/10 text-accent border-accent/20 animate-fade-in">
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  AI-Powered Analysis v2.0
                </Badge>
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight max-w-4xl mx-auto leading-tight">
                    Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Legal Comparison</span>
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Instantly analyze differences between legal texts with structure-aware precision.
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-0">
                        <div className="p-4 border-b border-border/10 flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                                <span className="text-sm font-medium text-muted-foreground">Original Text</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => navigator.clipboard.readText().then(setOldText)}>
                                <Copy className="w-3 h-3 mr-2" />
                                Paste
                            </Button>
                        </div>
                        <Textarea
                            value={oldText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOldText(e.target.value)}
                            className="w-full h-[400px] border-0 rounded-none bg-transparent resize-none p-6 font-mono text-sm leading-7 focus-visible:ring-0"
                            placeholder="Paste original text here..."
                            spellCheck={false}
                        />
                          <div className="px-4 py-2 bg-muted/20 border-t border-border/10 text-right">
                             <span className="text-xs text-muted-foreground font-mono">{oldText.length} chars</span>
                         </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/60">
                    <CardContent className="p-0">
                        <div className="p-4 border-b border-border/10 flex items-center justify-between bg-muted/20">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                                <span className="text-sm font-medium text-muted-foreground">Modified Text</span>
                            </div>
                             <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => navigator.clipboard.readText().then(setNewText)}>
                                <Copy className="w-3 h-3 mr-2" />
                                Paste
                            </Button>
                        </div>
                        <Textarea
                            value={newText}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewText(e.target.value)}
                            className="w-full h-[400px] border-0 rounded-none bg-transparent resize-none p-6 font-mono text-sm leading-7 focus-visible:ring-0"
                            placeholder="Paste new version here..."
                            spellCheck={false}
                        />
                          <div className="px-4 py-2 bg-muted/20 border-t border-border/10 text-right">
                             <span className="text-xs text-muted-foreground font-mono">{newText.length} chars</span>
                         </div>
                    </CardContent>
                </Card>
              </div>

              <div className="flex justify-center pt-8">
                <Button
                    size="xl"
                    variant="glow"
                    onClick={handleCompare}
                    disabled={!oldText || !newText || isComparing}
                    className="w-full md:w-auto min-w-[240px]"
                >
                    {isComparing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Start Comparison
                        <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
                      </>
                    )}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Toolbar */}
              <div className="glass-card rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 sticky top-24 z-40">
                 <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDiffResult(null)} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        New Compare
                    </Button>
                    <div className="w-[1px] h-6 bg-border/20 mx-2"></div>
                    <div className="flex bg-secondary/50 p-1 rounded-lg">
                        <Button
                            variant={viewMode === 'git' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('git')}
                            className="h-8 text-xs"
                        >
                            Git View
                        </Button>
                        <Button
                            variant={viewMode === 'sidebyside' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('sidebyside')}
                            className="h-8 text-xs"
                        >
                            Side by Side
                        </Button>
                        <Button
                            variant={viewMode === 'article-structure' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('article-structure')}
                            className="h-8 text-xs"
                        >
                            Structure
                        </Button>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 pr-2">
                     <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Similarity</span>
                     <Badge variant="outline" className="text-base px-3 py-1 border-accent/30 bg-accent/5 text-accent font-mono">
                         {(diffResult.similarity * 100).toFixed(1)}%
                     </Badge>
                 </div>
              </div>

               <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                     {[
                        { label: 'Additions', value: diffResult.stats.additions, color: 'text-green-400', bg: 'bg-green-500/10' },
                        { label: 'Deletions', value: diffResult.stats.deletions, color: 'text-red-400', bg: 'bg-red-500/10' },
                        { label: 'Modifications', value: diffResult.stats.modifications, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { label: 'Unchanged', value: diffResult.stats.unchanged, color: 'text-muted-foreground', bg: 'bg-muted/10' }
                    ].map((stat) => (
                        <Card key={stat.label} className="bg-card/40 border-border/10 overflow-hidden">
                            <CardContent className="p-4 flex flex-col items-center justify-center text-center relative">
                                <span className={cn("text-3xl font-bold font-mono py-1", stat.color)}>{stat.value}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                                <div className={cn("absolute inset-x-0 bottom-0 h-1 opacity-50", stat.color.replace('text-', 'bg-'))}></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="lg:col-span-9">
                    <Card className="overflow-hidden min-h-[600px] bg-card/40 border-border/40">
                        <CardContent className="p-0">
                             {viewMode === 'git' && (
                                <GitDiffView changes={diffResult.changes} />
                             )}
                             {viewMode === 'sidebyside' && (
                               <SideBySideView changes={diffResult.changes} />
                             )}
                             {viewMode === 'article-structure' && diffResult.articleChanges && (
                               <div className="p-6">
                                 <div className="mb-6 flex items-center justify-between">
                                   <div>
                                       <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                         <Sparkles className="w-4 h-4 text-accent" />
                                         Structural Analysis
                                       </h3>
                                       <p className="text-sm text-muted-foreground mt-0.5">
                                         Detects content shifts and structural updates.
                                       </p>
                                   </div>
                                 </div>
                                 <ArticleChangeView changes={diffResult.articleChanges.filter(c => c.type !== 'unchanged' || c.oldArticle?.number !== 'root')} />
                               </div>
                             )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-3 space-y-4">
                  <Card className="border-border/10 sticky top-[180px]">
                      <CardContent className="p-4 space-y-4">
                           <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-border/10">
                             <Search className="w-3.5 h-3.5" />
                             Insights
                           </h3>
                           <EntityHighlight entities={diffResult.entities} />
                           <div className="py-2">
                               <AnchorNavigation changes={diffResult.changes} />
                           </div>
                      </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
