'use client';

import React from 'react';
import { Entity, EntityType } from '@/lib/types';
import { getEntityColor, getEntityTypeLabel } from '@/lib/diff-utils';
import { cn } from '@/lib/utils';

interface EntityHighlightProps {
  entities: Entity[];
  className?: string;
}

export default function EntityHighlight({ entities, className }: EntityHighlightProps) {
  // Group entities by type
  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<EntityType, Entity[]>);

  if (entities.length === 0) {
    return null;
  }

  return (
    <div className={cn('glass-effect rounded-lg p-4', className)}>
      <h3 className="font-semibold text-sm mb-3">识别实体</h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(groupedEntities).map(([type, typeEntities]) => (
          <div
            key={type}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium border',
              getEntityColor(type as EntityType)
            )}
          >
            {getEntityTypeLabel(type as EntityType)} ({typeEntities.length})
          </div>
        ))}
      </div>

      {/* Entity list */}
      <div className="space-y-3">
        {Object.entries(groupedEntities).map(([type, typeEntities]) => (
          <div key={type} className="space-y-1">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {getEntityTypeLabel(type as EntityType)}
            </h4>
            <div className="flex flex-wrap gap-2">
              {typeEntities.slice(0, 5).map((entity, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'px-2 py-1 rounded text-sm border',
                    getEntityColor(entity.type)
                  )}
                  title={`置信度: ${(entity.confidence * 100).toFixed(1)}%`}
                >
                  {entity.value}
                </div>
              ))}
              {typeEntities.length > 5 && (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  +{typeEntities.length - 5} 更多
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3 italic">
        * 实体识别由 NLP 模型提供，置信度 &gt; 85%
      </p>
    </div>
  );
}
