import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Folder } from 'lucide-react';
import type { ModuleGroup } from '../../../types';

interface ModuleGroupNodeProps {
  data: {
    module: ModuleGroup;
    isSelected?: boolean;
    isHighlighted?: boolean;
    isDimmed?: boolean;
    isSearchMatch?: boolean;
  };
}

export const ModuleGroupNode = memo(({ data }: ModuleGroupNodeProps) => {
  const { module, isSelected, isHighlighted, isDimmed, isSearchMatch } = data;

  return (
    <div
      className="node-card relative rounded-lg cursor-pointer overflow-hidden transition-all duration-200"
      style={{
        width: 250,
        height: 90,
        boxSizing: 'border-box',
        border: '1px solid',
        borderColor: isSearchMatch
          ? '#E35336'
          : isSelected
          ? '#E35336'
          : isHighlighted
          ? 'rgba(227,83,54,0.4)'
          : 'var(--border)',
        backgroundColor: 'var(--surface)',
        opacity: isDimmed ? 0.22 : 1,
        boxShadow: isSearchMatch
          ? '0 0 0 2.5px #E35336, 0 0 20px rgba(227,83,54,0.45)'
          : isSelected
          ? '0 0 0 2px rgba(227,83,54,0.25), 0 4px 16px rgba(0,0,0,0.12)'
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: isSelected ? '#E35336' : '#A0522D' }}
      />

      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8, height: 8,
          backgroundColor: 'var(--border-strong)',
          border: '2px solid var(--surface)',
        }}
      />

      <div className="px-3 py-3 pl-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'rgba(227,83,54,0.10)',
              border: '1px solid rgba(227,83,54,0.2)',
            }}
          >
            <Folder className="w-3.5 h-3.5" style={{ color: '#E35336' }} />
          </div>
          <div className="min-w-0">
            <h4
              className="font-semibold text-xs truncate"
              style={{ color: isSelected ? '#E35336' : 'var(--text-primary)' }}
            >
              {module.name}
            </h4>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {module.files.length} {module.files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
        </div>

        <div
          className="mt-2.5 pt-2 border-t flex items-center justify-between text-[10px]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span>Module Group</span>
          <span className="font-mono">{module.dependencies.length} deps</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 8, height: 8,
          backgroundColor: '#E35336',
          border: '2px solid var(--surface)',
          opacity: isSelected ? 1 : 0.5,
        }}
      />
    </div>
  );
});

ModuleGroupNode.displayName = 'ModuleGroupNode';
