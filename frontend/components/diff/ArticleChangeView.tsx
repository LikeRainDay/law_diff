'use client';

import { ArticleChange, ArticleChangeType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, X, MoveHorizontal, ListPlus, ListX, Split, Merge, Sparkles } from 'lucide-react';

interface ArticleChangeViewProps {
  changes: ArticleChange[];
}

export function ArticleChangeView({ changes }: ArticleChangeViewProps) {
  return (
    <div className="space-y-4">
      {changes.map((change, index) => (
        <ArticleChangeCard key={index} change={change} />
      ))}
    </div>
  );
}

interface ArticleChangeCardProps {
  change: ArticleChange;
}

function ArticleChangeCard({ change }: ArticleChangeCardProps) {
  const typeConfig = getTypeConfig(change.type);

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-lg hover:shadow-cyan-500/5", typeConfig.borderColor)}>
      <CardContent className="p-0">
          <div className={cn("px-4 py-3 border-b flex items-center justify-between bg-muted/30", typeConfig.borderColor)}>
             <div className="flex items-center gap-3">
                 <Badge variant={typeConfig.badgeVariant as any} className="gap-1.5 pl-1.5 pr-2.5">
                     {typeConfig.icon}
                     {typeConfig.label}
                 </Badge>
             </div>
             {change.similarity !== undefined && (
               <div className="flex items-center gap-2">
                 <span className="text-xs text-muted-foreground uppercase tracking-wider">Similarity</span>
                 <span className={cn("text-sm font-bold font-mono", change.similarity > 0.8 ? "text-green-400" : "text-amber-400")}>
                    {(change.similarity * 100).toFixed(1)}%
                 </span>
               </div>
             )}
          </div>

          <div className="p-4 bg-muted/10">
            {change.type === 'added' && change.newArticles && (
              <AddedArticle articles={change.newArticles} />
            )}

            {change.type === 'deleted' && change.oldArticle && (
              <DeletedArticle article={change.oldArticle} />
            )}

            {(change.type === 'modified' || change.type === 'renumbered' || change.type === 'unchanged') &&
             change.oldArticle && change.newArticles && (
              <ModifiedArticle
                oldArticle={change.oldArticle}
                newArticle={change.newArticles[0]}
                changeType={change.type}
              />
            )}
          </div>
      </CardContent>
    </Card>
  );
}

function AddedArticle({ articles }: { articles: ArticleChangeCardProps['change']['newArticles'] }) {
  if (!articles || articles.length === 0) return null;
  const article = articles[0];

  return (
    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
      <div className="mb-2 text-sm font-medium text-green-400 flex items-center gap-2">
         <ListPlus className="w-4 h-4" />
         新增 第{article.number}条
      </div>
      <div className="text-foreground leading-relaxed">{article.content}</div>
    </div>
  );
}

function DeletedArticle({ article }: { article: NonNullable<ArticleChangeCardProps['change']['oldArticle']> }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
      <div className="mb-2 text-sm font-medium text-red-400 flex items-center gap-2">
         <ListX className="w-4 h-4" />
         删除 第{article.number}条
      </div>
      <div className="text-muted-foreground line-through leading-relaxed opacity-60">{article.content}</div>
    </div>
  );
}

function ModifiedArticle({
  oldArticle,
  newArticle,
  changeType
}: {
  oldArticle: NonNullable<ArticleChangeCardProps['change']['oldArticle']>;
  newArticle: NonNullable<ArticleChangeCardProps['change']['newArticles']>[0];
  changeType: ArticleChangeType;
}) {
  const isRenumbered = changeType === 'renumbered';
  const numberChanged = oldArticle.number !== newArticle.number;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Old Version */}
      <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground border-b border-white/5 pb-2">
          <span>旧版</span>
          {numberChanged && (
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 border border-amber-500/20">
              第{oldArticle.number}条
            </span>
          )}
          {!numberChanged && <span className="text-slate-500">第{oldArticle.number}条</span>}
        </div>
        <div className={`text-slate-300 leading-relaxed ${changeType === 'modified' ? 'opacity-70' : ''}`}>
          {oldArticle.content}
        </div>
      </div>

      {/* New Version */}
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-400 border-b border-cyan-500/10 pb-2">
          <span>新版</span>
          {numberChanged && (
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-300">
              第{newArticle.number}条
            </span>
          )}
          {!numberChanged && <span className="text-cyan-500/70">第{newArticle.number}条</span>}
        </div>
        <div className="text-slate-100 leading-relaxed">
          {newArticle.content}
        </div>
      </div>
    </div>
  );
}

function getTypeConfig(type: ArticleChangeType) {
  const configs: Record<string, any> = {
    unchanged: {
      label: '未变更',
      badgeVariant: 'outline',
      borderColor: 'border-border/40',
      icon: <Check className="w-3 h-3" />
    },
    modified: {
      label: '内容修改',
      badgeVariant: 'info',
      borderColor: 'border-blue-500/30',
      icon: <X className="w-3 h-3 rotate-45" />
    },
    renumbered: {
      label: '条号变更',
      badgeVariant: 'warning',
      borderColor: 'border-amber-500/30',
      icon: <MoveHorizontal className="w-3 h-3" />
    },
    split: {
      label: '拆分条款',
      badgeVariant: 'secondary',
      borderColor: 'border-purple-500/30',
      icon: <Split className="w-3 h-3" />
    },
    merged: {
      label: '合并条款',
      badgeVariant: 'secondary',
      borderColor: 'border-indigo-500/30',
      icon: <Merge className="w-3 h-3" />
    },
    moved: {
      label: '位置迁移',
      badgeVariant: 'warning',
      borderColor: 'border-yellow-500/30',
      icon: <MoveHorizontal className="w-3 h-3" />
    },
    added: {
      label: '新增条款',
      badgeVariant: 'success',
      borderColor: 'border-green-500/30',
      icon: <ListPlus className="w-3 h-3" />
    },
    deleted: {
      label: '删除条款',
      badgeVariant: 'destructive',
      borderColor: 'border-red-500/30',
      icon: <ListX className="w-3 h-3" />
    },
    replaced: {
      label: '内容替换',
      badgeVariant: 'info',
      borderColor: 'border-orange-500/30',
      icon: <Check className="w-3 h-3" />
    },
    preamble: {
      label: '规范导语',
      badgeVariant: 'outline',
      borderColor: 'border-border/40',
      icon: <Sparkles className="w-3 h-3" />
    }
  };

  return configs[type] || configs.unchanged;
}
