'use client';

import { SITE_CONFIG } from '@/lib/constants';
import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/10 bg-muted/10 backdrop-blur-sm mt-auto">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-foreground">Legal<span className="text-cyan-400">Mind</span></span>
            <span className="text-sm text-muted-foreground">
               {SITE_CONFIG.copyright}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">使用指南</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">隐私政策</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">服务条款</a>
          </div>

          <div className="flex items-center gap-4">
            <a href={SITE_CONFIG.links.github} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
