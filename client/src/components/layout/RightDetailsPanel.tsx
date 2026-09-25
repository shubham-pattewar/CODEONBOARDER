import React, { useState } from 'react';
import {
  PanelRightClose, PanelRight, FileCode, ArrowUpRight, ArrowDownLeft,
  AlertTriangle, Copy, Check, ExternalLink, Sparkles, BarChart2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const fmtBytes = (b: number): string => {
  if (b === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, count, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-100"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
          {count !== undefined && (
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface-elevated)',
                fontWeight: 400,
              }}
            >
              {count}
            </span>
          )}
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
};

export const RightDetailsPanel: React.FC = () => {
  const { analysis, selectedNodeId, setSelectedNodeId, detailsPanelOpen, toggleDetailsPanel, updateNodeSummary } = useAppStore();

  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const node = analysis?.nodes?.find(n => n.id === selectedNodeId);

  const handleCopyPath = () => {
    if (!node) return;
    navigator.clipboard.writeText(node.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleCopyMermaid = () => {
    if (!node) return;
    const sid = (p: string) => p.replace(/[^a-zA-Z0-9_]/g, '_');
    let mmd = `graph TD\n`;
    mmd += `  classDef focus fill:#3d1a12,stroke:#E35336,stroke-width:2px,color:#F5F5DC;\n`;
    mmd += `  classDef ref fill:#211D1A,stroke:#918A80,stroke-width:1px,color:#C9C3B5;\n\n`;
    mmd += `  ${sid(node.id)}["${node.label}"]:::focus\n`;
    for (const imp of node.imports) {
      const label = analysis?.nodes?.find(n => n.id === imp)?.label || imp.split('/').pop() || imp;
      mmd += `  ${sid(node.id)} --> ${sid(imp)}["${label}"]:::ref\n`;
    }
    for (const by of node.importedBy) {
      const label = analysis?.nodes?.find(n => n.id === by)?.label || by.split('/').pop() || by;
      mmd += `  ${sid(by)}["${label}"]:::ref --> ${sid(node.id)}\n`;
    }
    navigator.clipboard.writeText(mmd);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  const githubUrl = () => {
    if (!analysis || !node) return '#';
    return `https://github.com/${analysis.owner}/${analysis.repo}/blob/${analysis.branch || 'main'}/${node.path}`;
  };

  const handleGenerateSummary = async () => {
    if (!analysis || !node) return;
    const analysisId = analysis._id || analysis.id;
    if (!analysisId) return;

    setGeneratingSummary(true);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/file-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: node.path }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          updateNodeSummary(node.path, data.summary);
        }
      }
    } catch (err) {
      console.error('Error generating summary:', err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (!detailsPanelOpen) {
    return (
      <div
        className="flex flex-col items-center p-2 border-l"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <button
          onClick={toggleDetailsPanel}
          className="p-1.5 rounded-md transition-colors duration-150"
          style={{ color: 'var(--text-muted)' }}
          title="Expand inspector"
          onMouseEnter={e => (e.currentTarget.style.color = '#E35336')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in"
        onClick={toggleDetailsPanel}
      />

      <aside
        className="fixed md:static right-0 top-14 bottom-0 z-40 w-80 md:w-72 flex-shrink-0 border-l flex flex-col shadow-2xl md:shadow-none transition-transform duration-200"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
          height: 'calc(100vh - 3.5rem)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Inspector
            </span>
            {node && (
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
                style={{
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface-elevated)',
                }}
              >
                #{node.rank || 1}
              </span>
            )}
          </div>
          <button
            onClick={toggleDetailsPanel}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Collapse inspector"
            onMouseEnter={e => (e.currentTarget.style.color = '#E35336')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>

        {node ? (
          <div className="flex-1 overflow-y-auto">
            {/* File header */}
            <div className="px-4 py-4 border-b space-y-3" style={{ borderColor: 'var(--border)' }}>
              {/* Filename + GitHub link */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="w-4 h-4 flex-shrink-0" style={{ color: '#E35336' }} />
                  <h3 className="font-mono text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {node.label}
                  </h3>
                </div>
                <a
                  href={githubUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--text-secondary)',
                  }}
                  title="Open on GitHub"
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = '#E35336';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(227,83,54,0.3)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="text-[11px] font-medium">GitHub</span>
                </a>
              </div>

              {/* Path */}
              <div
                className="flex items-center justify-between gap-2 p-2 rounded-md border"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                <span className="font-mono text-[11px] truncate pr-1" style={{ color: 'var(--text-secondary)' }}>
                  {node.path}
                </span>
                <button
                  onClick={handleCopyPath}
                  className="flex-shrink-0 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Copy path"
                  onMouseEnter={e => (e.currentTarget.style.color = '#E35336')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {copiedPath
                    ? <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                    : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {node.language}
                </span>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'rgba(227,83,54,0.08)',
                    borderColor: 'rgba(227,83,54,0.25)',
                    color: '#E35336',
                  }}
                >
                  {node.fileType}
                </span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {fmtBytes(node.sizeBytes)}
                </span>
              </div>

              {/* Cycle warning */}
              {node.isCycleMember && (
                <div
                  className="flex items-start gap-2.5 p-2.5 rounded-md border text-xs"
                  style={{
                    backgroundColor: 'rgba(245,158,11,0.06)',
                    borderColor: 'rgba(245,158,11,0.25)',
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                  <div>
                    <p className="font-semibold" style={{ color: '#F59E0B' }}>Circular Dependency</p>
                    <p className="mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      This module is in a circular import loop. Consider extracting shared types.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* AI Summary Section */}
            <div className="px-4 py-3 border-b space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  <Sparkles className="w-3 h-3" style={{ color: '#E35336' }} />
                  Architectural Role
                </div>
                <button
                  onClick={handleGenerateSummary}
                  disabled={generatingSummary}
                  className="text-[10px] flex items-center gap-1 text-[#E35336] hover:underline disabled:opacity-50"
                  title="Generate or refresh AI summary"
                >
                  {generatingSummary ? 'Thinking...' : 'Refresh AI'}
                </button>
              </div>

              <p
                className="text-xs leading-relaxed p-2.5 rounded-md border"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
              >
                {node.summary || 'Click Refresh AI to generate an architectural summary for this file.'}
              </p>
            </div>

          {/* Metrics */}
          <Section title="Metrics" icon={<BarChart2 className="w-3 h-3" />}>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {[
                { label: 'Imports (out)', value: node.imports.length },
                { label: 'Imported by (in)', value: node.importedBy.length },
                { label: 'Out degree', value: node.outDegree },
                { label: 'In degree', value: node.inDegree },
              ].map(m => (
                <div
                  key={m.label}
                  className="p-2 rounded-md border"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                    {m.label}
                  </div>
                  <div className="text-lg font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Imports */}
          <Section title="Imports" icon={<ArrowUpRight className="w-3 h-3" />} count={node.imports.length}>
            {node.imports.length > 0 ? (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {node.imports.map(imp => {
                  const n = analysis?.nodes?.find(n => n.id === imp);
                  return (
                    <button
                      key={imp}
                      onClick={() => setSelectedNodeId(imp)}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-mono rounded-md border flex items-center justify-between transition-all duration-100"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                      title={imp}
                      onMouseEnter={e => {
                        (e.currentTarget).style.borderColor = 'rgba(227,83,54,0.3)';
                        (e.currentTarget).style.color = '#E35336';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget).style.borderColor = 'var(--border)';
                        (e.currentTarget).style.color = 'var(--text-secondary)';
                      }}
                    >
                      <span className="truncate">{n?.label || imp}</span>
                      {n && <span className="text-[10px] ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtBytes(n.sizeBytes)}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No file imports</p>
            )}
          </Section>

          {/* Imported by */}
          <Section title="Imported By" icon={<ArrowDownLeft className="w-3 h-3" />} count={node.importedBy.length}>
            {node.importedBy.length > 0 ? (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {node.importedBy.map(by => {
                  const n = analysis?.nodes?.find(n => n.id === by);
                  return (
                    <button
                      key={by}
                      onClick={() => setSelectedNodeId(by)}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-mono rounded-md border flex items-center justify-between transition-all duration-100"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                      title={by}
                      onMouseEnter={e => {
                        (e.currentTarget).style.borderColor = 'rgba(227,83,54,0.3)';
                        (e.currentTarget).style.color = '#E35336';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget).style.borderColor = 'var(--border)';
                        (e.currentTarget).style.color = 'var(--text-secondary)';
                      }}
                    >
                      <span className="truncate">{n?.label || by}</span>
                      {n && <span className="text-[10px] ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtBytes(n.sizeBytes)}</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No callers</p>
            )}
          </Section>

          {/* Copy Mermaid */}
          <div className="p-4">
            <button
              onClick={handleCopyMermaid}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-150"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={e => {
                (e.currentTarget).style.borderColor = 'rgba(227,83,54,0.3)';
                (e.currentTarget).style.color = '#E35336';
              }}
              onMouseLeave={e => {
                (e.currentTarget).style.borderColor = 'var(--border)';
                (e.currentTarget).style.color = 'var(--text-secondary)';
              }}
            >
              {copiedMermaid ? (
                <>
                  <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                  <span style={{ color: '#22c55e' }}>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Subgraph (Mermaid)</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <FileCode className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Select a file</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Choose a file from the explorer or graph to inspect its dependencies.
            </p>
          </div>
        </div>
      )}
    </aside>
    </>
  );
};
