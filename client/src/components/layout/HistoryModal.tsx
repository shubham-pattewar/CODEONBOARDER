import React, { useState, useEffect } from 'react';
import {
  History, X, Search, ArrowRight,
  Clock, Database, RefreshCw, FolderGit2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { HistoryItem } from '../../types';

export const HistoryModal: React.FC = () => {
  const { historyOpen, setHistoryOpen, setAnalysis } = useAppStore();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analysis');
      if (!res.ok) throw new Error('Failed to fetch analysis history');
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err?.message || 'Error loading history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (historyOpen) {
      fetchHistory();
    }
  }, [historyOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && historyOpen) {
        setHistoryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyOpen, setHistoryOpen]);

  if (!historyOpen) return null;

  const handleSelect = async (item: HistoryItem) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analysis/${item.id}`);
      if (!res.ok) throw new Error('Failed to load analysis details');
      const data = await res.json();
      setAnalysis(data);
      setHistoryOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.repo.toLowerCase().includes(q) ||
      item.owner.toLowerCase().includes(q) ||
      item.primaryLanguage.toLowerCase().includes(q)
    );
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setHistoryOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border flex flex-col max-h-[85vh] shadow-2xl overflow-hidden animate-scale-in"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(227,83,54,0.1)' }}
            >
              <History className="w-4 h-4" style={{ color: '#E35336' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Analysis History</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Browse and reopen previously analyzed repositories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-1.5 rounded-lg border transition-all"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--surface-elevated)',
              }}
              title="Refresh history"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setHistoryOpen(false)}
              className="p-1.5 rounded-lg border transition-all"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--surface-elevated)',
              }}
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl border"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
            }}
          >
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history by repo, owner, or language..."
              className="w-full bg-transparent text-xs focus:outline-none placeholder:opacity-40"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="p-0.5 rounded text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && items.length === 0 ? (
            <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-[#E35336]" />
              Loading history...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl text-xs text-red-400 bg-red-950/20 border border-red-800/40">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs space-y-2" style={{ color: 'var(--text-muted)' }}>
              <Database className="w-8 h-8 mx-auto opacity-30" />
              <p>No past analyses found.</p>
              <p className="text-[11px] opacity-75">
                Analyze a repository to automatically save its snapshot here.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all duration-150 cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#E35336';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: 'rgba(227,83,54,0.1)' }}
                  >
                    <FolderGit2 className="w-4 h-4" style={{ color: '#E35336' }} />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.owner}/{item.repo}
                      </span>
                      <span
                        className="font-mono text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0"
                        style={{
                          backgroundColor: 'var(--bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {item.commitSha ? item.commitSha.substring(0, 7) : 'HEAD'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <span
                        className="px-1.5 py-0.5 rounded font-medium text-[10px]"
                        style={{
                          backgroundColor: 'rgba(227,83,54,0.12)',
                          color: '#E35336',
                        }}
                      >
                        {item.primaryLanguage}
                      </span>
                      <span>•</span>
                      <span>{item.totalFiles || item.nodesCount} files</span>
                      <span>•</span>
                      <span>{item.edgesCount} edges</span>
                      {item.servicesCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{item.servicesCount} services</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 sm:flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all group-hover:scale-105"
                    style={{ backgroundColor: '#E35336' }}
                  >
                    <span>Load</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t text-[11px] flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--bg)' }}
        >
          <span>{items.length} total saved analyses</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};
