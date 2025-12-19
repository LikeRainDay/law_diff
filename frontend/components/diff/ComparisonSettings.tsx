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
}

export function ComparisonSettings({
  threshold,
  onThresholdChange,
  formatText,
  onFormatTextChange,
  showIdentical,
  onShowIdenticalChange,
}: ComparisonSettingsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white">
          <Settings2 className="h-4 w-4" />
          <span>对比设置</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="border-l border-slate-800 bg-slate-950 text-slate-200">
        <SheetHeader>
          <SheetTitle className="text-slate-100">高级对比设置</SheetTitle>
          <SheetDescription className="text-slate-400">
            调整算法参数以优化法律文本的结构化对比效果。
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-8 py-8">
          {/* Alignment Threshold */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium text-slate-200 flex items-center gap-2">
                <AlignLeft className="h-4 w-4 text-cyan-400" />
                对齐敏感度
              </Label>
              <span className="text-sm text-cyan-400 font-mono">{(threshold * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[threshold]}
              max={1}
              step={0.05}
              onValueChange={(vals) => onThresholdChange(vals[0])}
              className="py-4"
            />
            <p className="text-xs text-slate-500 leading-relaxed">
              控制判定两个条款为"修改"还是"不同"的相似度阈值。值越高，算法越倾向于认为它们是不同的条款（拆分/新增）。
            </p>
          </div>

          {/* Text Formatting */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="space-y-1">
              <Label className="text-base text-slate-200 flex items-center gap-2">
                <FileType className="h-4 w-4 text-blue-400" />
                智能格式化
              </Label>
              <p className="text-xs text-slate-500">
                预处理文本，确保每一条/款都在单独一行，提升对比准确度。
              </p>
            </div>
            <Switch
              checked={formatText}
              onCheckedChange={onFormatTextChange}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>

          {/* Show Identical */}
          <div className="flex items-center justify-between space-x-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="space-y-1">
              <Label className="text-base text-slate-200">显示相同条款</Label>
              <p className="text-xs text-slate-500">
                在对比视图中包含未变更的条款。关闭以专注于差异。
              </p>
            </div>
            <Switch
              checked={showIdentical}
              onCheckedChange={onShowIdenticalChange}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
