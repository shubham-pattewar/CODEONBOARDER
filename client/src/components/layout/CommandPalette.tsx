import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileCode, Layers, Server, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const CommandPalette: React.FC = () => {
  const { commandPaletteOpen, setCommandPaletteOpen, analysis, setSelectedNodeId, setViewMode } = useAppStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommandPaletteOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const results = useMemo(() => {
    if (!analysis || !query.trim()) return { files: [], modules: [], services: [] };
    const q = query.toLowerCase();

    const files = (analysis.nodes || [])
      .filter(n => n.path.toLowerCase().includes(q) || n.label.toLowerCase().includes(q))
      .slice(0, 8);

    const modules = (analysis.modules || [])
      .filter(m => m.name.toLowerCase().includes(q))
      .slice(0, 4);

    const services = (analysis.services || [])
      .filter(s => s.name.toLowerCase().includes(q))
      .slice(0, 4);

    return { files, modules, services };
  }, [query, analysis]);

  const hasResults = results.files.length > 0 || results.modules.length > 0 || results.services.length > 0;

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] cmd-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) setCommandPaletteOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden animate-scale-in"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
      >
        {/* Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search files, modules, services..."
            className="flex-1 bg-transparent text-sm focus:outline-none font-mono"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Search"
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd
            className="flex-shrink-0 font-mono text-[10px] px-1.5 py-1 rounded border"
            style={{
              color: 'var(--text-muted)',
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface-elevated)',
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-80">
          {!query.trim() && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Search className="w-6 h-6 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Type to search files, modules, or services
              </p>
            </div>
          )}

          {query && !hasResults && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No matching results for "{query}"</p>
            </div>
          )}

          {results.files.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface-elevated)' }}
              >
                Files
              </div>
              {results.files.map(file => (
                <button
                  key={file.id}
                  onClick={() => {
                    setSelectedNodeId(file.id);
                    setViewMode('file-flow');
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileCode className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#E35336' }} />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{file.label}</span>
                    <span className="ml-2 opacity-60 truncate">{file.path}</span>
                  </div>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0"
                    style={{
                      backgroundColor: 'rgba(227,83,54,0.08)',
                      borderColor: 'rgba(227,83,54,0.2)',
                      color: '#E35336',
                    }}
                  >
                    {file.fileType}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.modules.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface-elevated)' }}
              >
                Modules
              </div>
              {results.modules.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => {
                    setViewMode('architecture');
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Layers className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#A0522D' }} />
                  <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{mod.name}</span>
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {mod.files.length} files
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.services.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--surface-elevated)' }}
              >
                Services
              </div>
              {results.services.map(svc => (
                <button
                  key={svc.name}
                  onClick={() => {
                    setViewMode('services');
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors text-left"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Server className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#F4A460' }} />
                  <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{svc.name}</span>
                  <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>{svc.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-t text-[10px]"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-muted)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border font-mono" style={{ borderColor: 'var(--border)' }}>↑↓</kbd>
              <span>navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border font-mono" style={{ borderColor: 'var(--border)' }}>↵</kbd>
              <span>select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border font-mono" style={{ borderColor: 'var(--border)' }}>Esc</kbd>
            <span>close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
