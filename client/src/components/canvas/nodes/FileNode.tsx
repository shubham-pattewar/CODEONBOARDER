import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Focus, Copy, Check, ExternalLink, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { FileNodeData } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';

interface FileNodeProps {
  data: {
    file: FileNodeData;
    isSelected?: boolean;
    isHighlighted?: boolean;
    isDimmed?: boolean;
    isSearchMatch?: boolean;
    isIncoming?: boolean;
    isOutgoing?: boolean;
    onFocusNeighborhood?: (fileId: string) => void;
    onHighlightCallers?: (fileId: string) => void;
    onHighlightImports?: (fileId: string) => void;
  };
}

const LANG_COLOR: Record<string, string> = {
  typescript: '#3B82F6',
  tsx:        '#60A5FA',
  javascript: '#F59E0B',
  jsx:        '#FBB040',
  json:       '#D97706',
  yaml:       '#10B981',
  dockerfile: '#06B6D4',
  css:        '#38BDF8',
  scss:       '#EC4899',
  python:     '#EAB308',
  go:         '#22D3EE',
  rust:       '#F97316',
  java:       '#EF4444',
};

function langDot(lang: string): string {
  return LANG_COLOR[lang] ?? '#918A80';
}

export const FileNode = memo(({ data }: FileNodeProps) => {
  const {
    file, isSelected, isHighlighted, isDimmed, isSearchMatch,
    isIncoming, isOutgoing,
    onFocusNeighborhood, onHighlightCallers, onHighlightImports,
  } = data;

  const repoOwner = useAppStore(s => s.analysis?.owner);
  const repoName = useAppStore(s => s.analysis?.repo);
  const repoBranch = useAppStore(s => s.analysis?.branch);
  const [copied, setCopied] = useState(false);

  const isEntry = file.fileType === 'entry';
  const isCycle = file.isCycleMember;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(file.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenGitHub = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!repoOwner || !repoName) return;
    const branch = repoBranch || 'main';
    const url = `https://github.com/${repoOwner}/${repoName}/blob/${branch}/${file.path}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocusNeighborhood?.(file.id);
  };

  let borderColor = 'var(--border)';
  let bgColor = 'var(--surface)';
  let leftAccent = 'transparent';

  if (isCycle) {
    borderColor = 'rgba(245,158,11,0.5)';
    leftAccent = '#F59E0B';
  } else if (isEntry) {
    borderColor = 'rgba(227,83,54,0.4)';
    leftAccent = '#E35336';
  } else if (file.fileType === 'service') {
    borderColor = 'rgba(16,185,129,0.3)';
    leftAccent = '#10B981';
  }

  // Directional or search / selection border overrides
  if (isSearchMatch) {
    borderColor = '#E35336';
    leftAccent = '#E35336';
  } else if (isSelected) {
    borderColor = '#E35336';
    leftAccent = '#E35336';
  } else if (isIncoming) {
    borderColor = '#38BDF8'; // Sky Blue for upstream callers
    leftAccent = '#38BDF8';
  } else if (isOutgoing) {
    borderColor = '#E35336'; // Warm Coral for downstream dependencies
    leftAccent = '#E35336';
  } else if (isHighlighted) {
    borderColor = 'rgba(227,83,54,0.5)';
  }

  // Determine shadow styling without resizing
  let boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
  if (isSearchMatch) {
    boxShadow = '0 0 0 2.5px #E35336, 0 0 20px rgba(227,83,54,0.45)';
  } else if (isSelected) {
    boxShadow = '0 0 0 2px #E35336, 0 8px 24px rgba(227,83,54,0.25)';
  } else if (isIncoming) {
    boxShadow = '0 0 0 2px #38BDF8, 0 4px 16px rgba(56,189,248,0.25)';
  } else if (isOutgoing) {
    boxShadow = '0 0 0 2px #E35336, 0 4px 16px rgba(227,83,54,0.25)';
  } else if (isHighlighted) {
    boxShadow = '0 0 0 1px rgba(227,83,54,0.3), 0 2px 8px rgba(0,0,0,0.08)';
  }

  const cleanFolder = file.folder && file.folder !== '.' ? file.folder : '';

  return (
    <div
      className="node-card relative rounded-lg cursor-pointer select-none transition-all duration-200"
      title={file.path}
      style={{
        width: 240,
        height: 92,
        boxSizing: 'border-box',
        border: '1px solid',
        borderColor,
        backgroundColor: bgColor,
        opacity: isDimmed ? 0.2 : 1,
        boxShadow,
        zIndex: isSelected ? 50 : (isIncoming || isOutgoing) ? 30 : 1,
      }}
    >
      {/* Left accent stripe */}
      {leftAccent !== 'transparent' && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
          style={{ backgroundColor: leftAccent }}
        />
      )}

      {/* Target handle (incoming imports to this file) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 9, height: 9,
          backgroundColor: isIncoming ? '#38BDF8' : isSelected ? '#E35336' : 'var(--border-strong)',
          border: '2px solid var(--surface)',
        }}
      />

      <div className="h-full flex flex-col justify-between px-3 py-2.5 pl-3.5">
        {/* Top row: folder path + quick action hover icons */}
        <div className="flex items-center justify-between gap-1 text-[9.5px]">
          <span
            className="truncate font-mono"
            style={{ color: 'var(--text-muted)' }}
            title={file.path}
          >
            {cleanFolder || '/'}
          </span>

          {/* Quick Micro Action buttons visible on hover or select */}
          <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
            {onFocusNeighborhood && (
              <button
                onClick={handleFocus}
                title="Isolate connected subgraph"
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <Focus className="w-3 h-3 hover:text-[#E35336]" />
              </button>
            )}
            <button
              onClick={handleCopy}
              title="Copy file path"
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
              style={{ color: copied ? '#22C55E' : 'var(--text-muted)' }}
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 hover:text-white" />}
            </button>
            {repoOwner && repoName && (
              <button
                onClick={handleOpenGitHub}
                title="Open on GitHub"
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <ExternalLink className="w-3 h-3 hover:text-[#F4A460]" />
              </button>
            )}
          </div>
        </div>

        {/* Center row: language dot + filename + directional badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: langDot(file.language) }}
            />
            <span
              className="font-mono text-[11.5px] font-bold truncate"
              style={{
                color: isSelected
                  ? '#E35336'
                  : isIncoming
                  ? '#38BDF8'
                  : isOutgoing
                  ? '#E35336'
                  : 'var(--text-primary)',
              }}
            >
              {file.label}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {isIncoming && (
              <span
                className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-0.2 rounded"
                style={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8' }}
              >
                caller
              </span>
            )}
            {isOutgoing && (
              <span
                className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-0.2 rounded"
                style={{ backgroundColor: 'rgba(227,83,54,0.15)', color: '#E35336' }}
              >
                import
              </span>
            )}
            {isEntry && !isIncoming && !isOutgoing && (
              <span
                className="text-[8.5px] font-bold uppercase tracking-wide px-1 py-0.5 rounded"
                style={{ backgroundColor: 'rgba(227,83,54,0.14)', color: '#E35336' }}
              >
                entry
              </span>
            )}
            {isCycle && (
              <span title="Circular dependency loop">
                <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
              </span>
            )}
          </div>
        </div>

        {/* Bottom row: language pill + interactive caller/import chips */}
        <div
          className="flex items-center justify-between pt-1.5 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-[10px] capitalize font-medium leading-none" style={{ color: 'var(--text-muted)' }}>
            {file.language}
          </span>

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHighlightCallers?.(file.id);
              }}
              className="flex items-center gap-0.5 px-1 py-0.5 rounded border transition-colors hover:border-[#38BDF8]"
              style={{
                backgroundColor: isIncoming ? 'rgba(56,189,248,0.15)' : 'rgba(0,0,0,0.1)',
                borderColor: isIncoming ? '#38BDF8' : 'var(--border)',
                color: isIncoming ? '#38BDF8' : 'var(--text-muted)',
              }}
              title={`${file.inDegree} callers (files that import this). Click to focus.`}
            >
              <ArrowDownLeft className="w-2.5 h-2.5" />
              <span>{file.inDegree}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onHighlightImports?.(file.id);
              }}
              className="flex items-center gap-0.5 px-1 py-0.5 rounded border transition-colors hover:border-[#E35336]"
              style={{
                backgroundColor: isOutgoing ? 'rgba(227,83,54,0.15)' : 'rgba(0,0,0,0.1)',
                borderColor: isOutgoing ? '#E35336' : 'var(--border)',
                color: isOutgoing ? '#E35336' : 'var(--text-muted)',
              }}
              title={`${file.outDegree} imports (dependencies this file needs). Click to focus.`}
            >
              <ArrowUpRight className="w-2.5 h-2.5" />
              <span>{file.outDegree}</span>
            </button>
          </div>
        </div>
      </div>



      {/* Source handle (outgoing dependencies from this file) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 9, height: 9,
          backgroundColor: isOutgoing ? '#E35336' : isSelected ? '#E35336' : 'var(--border-strong)',
          border: '2px solid var(--surface)',
        }}
      />
    </div>
  );
});

FileNode.displayName = 'FileNode';
