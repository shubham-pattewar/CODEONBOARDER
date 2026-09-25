import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode } from 'lucide-react';
import type { ReadingOrderItem, FileNodeData } from '../../../types';

interface StartHereNodeProps {
  data: {
    item: ReadingOrderItem;
    file?: FileNodeData;
    isSelected?: boolean;
    isDimmed?: boolean;
    isSearchMatch?: boolean;
  };
}

export const StartHereNode = memo(({ data }: StartHereNodeProps) => {
  const { item, isSelected, isDimmed, isSearchMatch } = data;
  const baseName = item.path.split('/').pop() || item.path;

  return (
    <div
      className="node-card relative rounded-xl cursor-pointer transition-all duration-200"
      style={{
        width: 340,
        height: 130,
        boxSizing: 'border-box',
        border: '1px solid',
        borderColor: isSearchMatch ? '#E35336' : isSelected ? '#E35336' : 'var(--border)',
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
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
        style={{ backgroundColor: '#E35336', opacity: isSelected ? 1 : 0.6 }}
      />

      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 9,
          height: 9,
          backgroundColor: isSelected ? '#E35336' : 'var(--border-strong)',
          border: '2px solid var(--surface)',
          top: -5,
        }}
      />

      <div className="h-full flex flex-col justify-between p-3.5 pl-4 select-none">
        {/* Top row: Rank badge + file info */}
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 text-white shadow-sm"
            style={{
              backgroundColor: '#E35336',
              fontSize: '12px',
            }}
          >
            {String(item.rank).padStart(2, '0')}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#E35336' }} />
              <h4
                className="font-mono font-bold text-xs truncate"
                style={{ color: isSelected ? '#E35336' : 'var(--text-primary)' }}
                title={item.path}
              >
                {baseName}
              </h4>
            </div>
            <p
              className="font-mono text-[10px] truncate mt-0.5"
              style={{ color: 'var(--text-muted)' }}
              title={item.path}
            >
              {item.path}
            </p>
          </div>
        </div>

        {/* Bottom row: Reason & AI Summary */}
        <div
          className="pt-2 border-t flex flex-col justify-center"
          style={{ borderColor: 'var(--border)' }}
        >
          <p
            className="text-[11px] font-semibold leading-snug truncate"
            style={{ color: 'var(--text-secondary)' }}
            title={item.reason}
          >
            {item.reason}
          </p>
          {item.summary && (
            <p
              className="text-[10px] mt-1 line-clamp-2 leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
              title={item.summary}
            >
              {item.summary}
            </p>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 9,
          height: 9,
          backgroundColor: '#E35336',
          border: '2px solid var(--surface)',
          bottom: -5,
        }}
      />
    </div>
  );
});

StartHereNode.displayName = 'StartHereNode';
