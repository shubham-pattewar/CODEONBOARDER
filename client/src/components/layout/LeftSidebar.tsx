import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder, FolderOpen, Search, ChevronRight, ChevronDown,
  PanelLeftClose, PanelLeft, AlertTriangle, FolderMinus, FolderPlus, X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { FileNodeData } from '../../types';

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: FileNodeData;
  children: { [key: string]: TreeNode };
}

function langColor(lang: string): string {
  const map: Record<string, string> = {
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
  return map[lang] ?? '#918A80';
}

export const LeftSidebar: React.FC = () => {
  const {
    analysis, selectedNodeId, setSelectedNodeId,
    sidebarOpen, toggleSidebar,
    filters, setFilter,
    setCommandPaletteOpen,
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    '': true, 'src': true, 'packages': true,
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = { '': true };
    analysis?.nodes?.forEach(n => {
      n.path.split('/').forEach((_, i, parts) => {
        all[parts.slice(0, i + 1).join('/')] = true;
      });
    });
    setExpandedFolders(all);
  };

  const collapseAll = () => setExpandedFolders({ '': true });

  // Keyboard shortcut for Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setCommandPaletteOpen]);

  const tree = useMemo<TreeNode | null>(() => {
    if (!analysis?.nodes) return null;
    const root: TreeNode = { name: 'root', path: '', isFolder: true, children: {} };

    const filtered = analysis.nodes.filter(n => {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!n.path.toLowerCase().includes(q) && !n.label.toLowerCase().includes(q)) return false;
      }
      if (filters.hideTests && (n.fileType === 'test' || n.path.includes('.test.') || n.path.includes('.spec.') || n.path.includes('__tests__'))) return false;
      if (filters.hideConfig && (n.fileType === 'config' || n.path.endsWith('.json') || n.path.includes('.config.'))) return false;
      return true;
    });

    for (const node of filtered) {
      const parts = node.path.split('/');
      let cur = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');
        if (!cur.children[part]) {
          cur.children[part] = { name: part, path: currentPath, isFolder: !isFile, file: isFile ? node : undefined, children: {} };
        }
        cur = cur.children[part];
      }
    }
    return root;
  }, [analysis?.nodes, filters]);



  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedFolders[node.path] ?? (depth < 2);
    const sorted = Object.values(node.children).sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const isSelected = !node.isFolder && selectedNodeId === node.file?.id;

    return (
      <React.Fragment key={node.path}>
        {node.path !== '' && (
          <div
            onClick={() => {
              if (node.isFolder) toggleFolder(node.path);
              else if (node.file) setSelectedNodeId(node.file.id);
            }}
            style={{
              paddingLeft: `${Math.max(8, depth * 12)}px`,
              backgroundColor: isSelected ? 'rgba(227,83,54,0.09)' : 'transparent',
              color: isSelected ? '#E35336' : 'var(--text-secondary)',
            }}
            className="flex items-center gap-1.5 py-[3px] px-2 rounded-md text-xs cursor-pointer transition-all duration-100 group hover:opacity-90"
            onMouseEnter={e => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-elevated)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }
            }}
          >
            {node.isFolder ? (
              <>
                <span style={{ color: 'var(--text-muted)' }}>
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </span>
                {isExpanded
                  ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#E35336' }} />
                  : <Folder className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
                <span className="truncate font-medium">{node.name}</span>
                <span
                  className="font-mono text-[10px] ml-auto flex-shrink-0 opacity-50"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {Object.keys(node.children).length}
                </span>
              </>
            ) : (
              <>
                <span className="ml-3.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: langColor(node.file?.language || '') }} />
                <span className="font-mono text-[11px] truncate flex-1">
                  {node.name}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                  {node.file?.fileType === 'entry' && (
                    <span
                      className="text-[9px] px-1 py-0.5 rounded font-medium uppercase tracking-wide"
                      style={{
                        backgroundColor: 'rgba(227,83,54,0.12)',
                        color: '#E35336',
                      }}
                    >
                      entry
                    </span>
                  )}
                  {node.file?.isCycleMember && (
                    <span title="Circular dependency">
                      <AlertTriangle className="w-2.5 h-2.5" style={{ color: '#F59E0B' }} />
                    </span>
                  )}
                  {node.file && (node.file.inDegree > 0 || node.file.outDegree > 0) && (
                    <span
                      className="font-mono text-[9px] opacity-0 group-hover:opacity-60 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      ↓{node.file.inDegree}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {node.isFolder && (node.path === '' || isExpanded) && (
          <div>{sorted.map(c => renderNode(c, depth + 1))}</div>
        )}
      </React.Fragment>
    );
  };

  if (!sidebarOpen) {
    return (
      <div
        className="flex flex-col items-center p-2 border-r"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          title="Expand file tree"
          aria-label="Expand file tree"
          onMouseEnter={e => (e.currentTarget.style.color = '#E35336')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in"
        onClick={toggleSidebar}
      />
      <aside
        className="fixed md:static left-0 top-14 bottom-0 z-40 w-72 md:w-60 flex-shrink-0 border-r flex flex-col shadow-2xl md:shadow-none transition-transform duration-200"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
          height: 'calc(100vh - 3.5rem)',
        }}
      >
      {/* Header */}
      <div
        className="p-3 border-b space-y-2.5 flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Explorer
            </span>
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface-elevated)',
              }}
            >
              {analysis?.nodes?.length ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={expandAll} className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }} title="Expand all"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button onClick={collapseAll} className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }} title="Collapse all"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <FolderMinus className="w-3.5 h-3.5" />
            </button>
            <button onClick={toggleSidebar} className="p-1 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }} title="Collapse sidebar"
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search files..."
            value={filters.searchQuery}
            onChange={e => setFilter('searchQuery', e.target.value)}
            className="w-full text-xs font-mono pl-8 pr-7 py-2 rounded-md border focus:outline-none transition-all duration-150"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#E35336')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilter('searchQuery', '')}
              className="absolute right-2 top-2.5 p-0.5 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Tests', key: 'hideTests' as const },
            { label: 'Config', key: 'hideConfig' as const },
          ].map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key, !filters[chip.key])}
              className="text-[10px] px-2 py-0.5 rounded border transition-all duration-150"
              style={{
                backgroundColor: filters[chip.key] ? 'rgba(227,83,54,0.10)' : 'transparent',
                borderColor: filters[chip.key] ? 'rgba(227,83,54,0.35)' : 'var(--border)',
                color: filters[chip.key] ? '#E35336' : 'var(--text-muted)',
              }}
            >
              {filters[chip.key] ? '✓ ' : ''}{chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-px">
        {tree && renderNode(tree)}
        {tree && Object.keys(tree.children).length === 0 && (
          <div className="text-center py-8 space-y-2">
            <Search className="w-6 h-6 mx-auto opacity-30" style={{ color: 'var(--text-muted)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No matching files</p>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
