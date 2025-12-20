'use client';

import * as React from 'react';
import { Settings2, AlignLeft, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface ComparisonSettingsProps {
  threshold: number;
  onThresholdChange: (value: number) => void;
  formatText: boolean;
  onFormatTextChange: (value: boolean) => void;
  showIdentical: boolean;
  onShowIdenticalChange: (value: boolean) => void;
  minSimilarity: number;
  onMinSimilarityChange: (value: number) => void;
  maxSimilarity: number;
  onMaxSimilarityChange: (value: number) => void;
  invertSimilarity: boolean;
  onInvertSimilarityChange: (value: boolean) => void;
  language?: 'zh' | 'en';
}

export function ComparisonSettings({
  threshold,
  onThresholdChange,
  formatText,
  onFormatTextChange,
  showIdentical,
  onShowIdenticalChange,
  minSimilarity,
  onMinSimilarityChange,
  maxSimilarity,
  onMaxSimilarityChange,
  invertSimilarity,
  onInvertSimilarityChange,
  language = 'zh'
}: ComparisonSettingsProps) {
  const t = (key: string) => {
    const dict: Record<string, Record<string, string>> = {
        zh: {
            settings_title: '对比设置',
            settings_adv_title: '高级对比设置',
            settings_desc: '调整算法参数以优化法律文本的结构化对比效果。',
            settings_sensitivity: '对齐敏感度',
            settings_sensitivity_desc: '控制判定两个条款为"修改"还是"不同"的相似度阈值。值越高，算法越倾向于认为它们是不同的条款（拆分/新增）。',
            settings_format: '智能格式化',
            settings_format_desc: '预处理文本，确保每一条/款都在单独一行，提升对比准确度。',
            settings_show_identical: '显示相同条款',
            settings_show_identical_desc: '在对比视图中包含未变更的条款。关闭以专注于差异。',
            settings_sim_filter: '初始相似度过滤',
            settings_sim_filter_desc: '在大规模比对时，可设置初始返回的相似度区间。',
            settings_invert: '反向选择相似度',
        },
        en: {
            settings_title: 'Settings',
            settings_adv_title: 'Advanced Settings',
            settings_desc: 'Adjust algorithmic parameters to optimize legal text structural comparison.',
            settings_sensitivity: 'Alignment Sensitivity',
            settings_sensitivity_desc: 'Controls the similarity threshold for "Modify" vs "Different". Higher values make the algorithm stricter, preferring split/added types.',
            settings_format: 'Smart Formatting',
            settings_format_desc: 'Pre-process text to ensure each article/clause is on a single line for better accuracy.',
            settings_show_identical: 'Show Unchanged',
            settings_show_identical_desc: 'Include unchanged articles in the comparison view. Disable to focus on differences.',
            settings_sim_filter: 'Similarity Filter',
            settings_sim_filter_desc: 'Filter results by similarity score range.',
            settings_invert: 'Invert Similarity Selection',
        }
    };
    return dict[language][key] || key;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 shadow-sm transition-colors hover:bg-muted">
          <Settings2 className="h-4 w-4" />
          <span>{t('settings_title')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('settings_adv_title')}</SheetTitle>
          <SheetDescription>
            {t('settings_desc')}
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-8 py-8">
          {/* Alignment Threshold */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium flex items-center gap-2">
                <AlignLeft className="h-4 w-4 text-primary" />
                {t('settings_sensitivity')}
              </Label>
              <span className="text-sm font-mono font-medium text-muted-foreground">{(threshold * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[threshold]}
              max={1}
              step={0.01}
              onValueChange={(vals) => onThresholdChange(vals[0])}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('settings_sensitivity_desc')}
            </p>
          </div>

          <div className="h-px bg-border my-2"></div>

          {/* Similarity Filter Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <Label className="text-base font-medium">{t('settings_sim_filter')}</Label>
               <div className="flex gap-2">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{(minSimilarity * 100).toFixed(0)}%</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{(maxSimilarity * 100).toFixed(0)}%</span>
               </div>
            </div>
            <Slider
              value={[minSimilarity, maxSimilarity]}
              max={1}
              step={0.01}
              onValueChange={(vals) => {
                onMinSimilarityChange(vals[0]);
                onMaxSimilarityChange(vals[1]);
              }}
              className="py-4"
            />
            <div className="flex items-center justify-between">
               <Label htmlFor="invert-toggle" className="text-sm cursor-pointer">{t('settings_invert')}</Label>
               <Switch
                 id="invert-toggle"
                 checked={invertSimilarity}
                 onCheckedChange={onInvertSimilarityChange}
               />
            </div>
          </div>

          <div className="h-px bg-border my-2"></div>

          {/* Text Formatting */}
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1">
              <Label className="text-base flex items-center gap-2">
                <FileType className="h-4 w-4 text-blue-500" />
                {t('settings_format')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('settings_format_desc')}
              </p>
            </div>
            <Switch
              checked={formatText}
              onCheckedChange={onFormatTextChange}
            />
          </div>

          {/* Show Identical */}
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1">
              <Label className="text-base">{t('settings_show_identical')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('settings_show_identical_desc')}
              </p>
            </div>
            <Switch
              checked={showIdentical}
              onCheckedChange={onShowIdenticalChange}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
