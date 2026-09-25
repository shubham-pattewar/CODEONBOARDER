import React, { useState, useEffect, useRef } from 'react';
import {
  Sun, Moon, Layers, GitFork, Server, Compass, Download,
  ArrowLeft, FileCode, Image, ChevronDown,
  Check, Copy, FolderGit2, Search, RotateCw,
  History, Share2, KeyRound,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { ViewMode } from '../../types';

interface TopBarProps {
  onExportPng?: () => void;
  onExportSvg?: () => void;
  onExportMermaid?: () => void;
  onReanalyze?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onExportPng, onExportSvg, onExportMermaid, onReanalyze }) => {
  const {
    theme, toggleTheme,
    viewMode, setViewMode,
    analysis, resetToLanding,
    setCommandPaletteOpen,
    setHistoryOpen, setPatModalOpen,
    githubToken,
  } = useAppStore();

  const [exportOpen, setExportOpen] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard shortcut for views
  useEffect(() => {
    const viewKeys: Record<string, ViewMode> = { '1': 'architecture', '2': 'file-flow', '3': 'services', '4': 'start-here' };
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (viewKeys[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setViewMode(viewKeys[e.key]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setViewMode, setCommandPaletteOpen]);

  const handleCopySha = () => {
    if (analysis?.commitSha) {
      navigator.clipboard.writeText(analysis.commitSha);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

  const handleShare = () => {
    if (!analysis) return;
    const id = analysis._id || analysis.id;
    const url = `${window.location.origin}${window.location.pathname}#/analysis/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2200);
  };

  const handleReanalyzeClick = () => {
    if (onReanalyze) {
      setIsReanalyzing(true);
      onReanalyze();
      setTimeout(() => setIsReanalyzing(false), 2000);
    }
  };

  const tabs: { id: ViewMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'architecture', label: 'Architecture', icon: <Layers className="w-3.5 h-3.5" />, shortcut: '1' },
    { id: 'file-flow',    label: 'File Flow',    icon: <GitFork className="w-3.5 h-3.5" />, shortcut: '2' },
    { id: 'services',     label: 'Services',     icon: <Server className="w-3.5 h-3.5" />,  shortcut: '3' },
    { id: 'start-here',   label: 'Start Here',   icon: <Compass className="w-3.5 h-3.5" />, shortcut: '4' },
  ];

  return (
    <header
      className="h-14 flex items-center justify-between px-4 z-30 select-none flex-shrink-0 border-b"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: '0 1px 0 var(--border)',
      }}
    >
      {/* LEFT: Logo + Repo breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={resetToLanding}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-150"
          style={{ color: 'var(--text-muted)' }}
          title="Switch repository"
          aria-label="Back to home"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-elevated)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Switch</span>
        </button>

        <div className="h-4 w-px hidden sm:block" style={{ backgroundColor: 'var(--border)' }} />

        {/* Wordmark & Brand Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/codelogo.png"
            alt="Codebase Onboarder Logo"
            className="w-6 h-6 rounded-md object-contain shadow-sm border border-white/10"
          />
        </div>

        <div className="h-4 w-px hidden sm:block" style={{ backgroundColor: 'var(--border)' }} />

        {/* Repo breadcrumb */}
        <div className="flex items-center gap-1.5 min-w-0 text-xs">
          <FolderGit2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <span className="hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>{analysis?.owner}</span>
          <span className="hidden sm:inline" style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="font-semibold truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>
            {analysis?.repo}
          </span>

          {analysis?.commitSha && (
            <button
              onClick={handleCopySha}
              title={`Commit ${analysis.commitSha} — click to copy`}
              className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border transition-all duration-150"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <span>{analysis.commitSha.substring(0, 7)}</span>
              {copiedSha ? (
                <Check className="w-2.5 h-2.5" style={{ color: '#22c55e' }} />
              ) : (
                <Copy className="w-2.5 h-2.5 opacity-40" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* CENTER: View tabs */}
      <nav
        className="flex items-center p-0.5 rounded-lg border"
        style={{
          backgroundColor: 'var(--bg)',
          borderColor: 'var(--border)',
        }}
        aria-label="Views"
      >
        {tabs.map(tab => {
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              title={`${tab.label} (${tab.shortcut})`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
              style={{
                backgroundColor: isActive ? 'var(--surface)' : 'transparent',
                color: isActive ? '#E35336' : 'var(--text-secondary)',
                borderWidth: isActive ? '1px' : '1px',
                borderStyle: 'solid',
                borderColor: isActive ? 'var(--border)' : 'transparent',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              {tab.icon}
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* RIGHT: Search, re-analyze, share, export, history, pat, theme */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search / command palette */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all duration-150"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-muted)',
          }}
          title="Search files (⌘K)"
          aria-label="Open command palette"
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Search</span>
          <kbd
            className="hidden sm:inline font-mono text-[10px] px-1 py-0.5 rounded border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Re-analyze (Force refresh) */}
        {onReanalyze && (
          <button
            onClick={handleReanalyzeClick}
            disabled={isReanalyzing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
            }}
            title="Force refresh analysis from GitHub"
            aria-label="Re-analyze repository"
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin text-[#E35336]' : ''}`} />
            <span className="hidden lg:inline">Re-analyze</span>
          </button>
        )}

        {/* Shareable URL button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
          }}
          title="Copy shareable link"
          aria-label="Share analysis"
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          {copiedShare ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500 hidden sm:inline text-xs font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <span className="hidden lg:inline">Share</span>
            </>
          )}
        </button>

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
            }}
            aria-expanded={exportOpen}
            aria-haspopup="true"
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <Download className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown
              className="w-3 h-3 transition-transform"
              style={{
                color: 'var(--text-muted)',
                transform: exportOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {exportOpen && (
            <div
              className="absolute right-0 mt-1.5 w-52 rounded-lg border py-1 z-50 text-xs animate-fade-in-down"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
              }}
            >
              {[
                { label: 'Export as PNG', icon: Image, action: () => { setExportOpen(false); onExportPng?.(); } },
                { label: 'Export as SVG', icon: Image, action: () => { setExportOpen(false); onExportSvg?.(); } },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors duration-100"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />

              <button
                onClick={() => { setExportOpen(false); onExportMermaid?.(); }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors duration-100"
                style={{ color: '#E35336' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(227,83,54,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Copy Mermaid diagram</span>
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-px hidden sm:block" style={{ backgroundColor: 'var(--border)' }} />

        {/* History modal button */}
        <button
          onClick={() => setHistoryOpen(true)}
          className="p-1.5 rounded-lg border transition-all duration-150"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-muted)',
          }}
          title="Analysis History"
          aria-label="Open history"
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <History className="w-3.5 h-3.5" />
        </button>

        {/* PAT / Token modal button */}
        <button
          onClick={() => setPatModalOpen(true)}
          className="p-1.5 rounded-lg border transition-all duration-150 relative"
          style={{
            borderColor: githubToken ? 'rgba(227,83,54,0.4)' : 'var(--border)',
            backgroundColor: 'var(--surface-elevated)',
            color: githubToken ? '#E35336' : 'var(--text-muted)',
          }}
          title={githubToken ? 'GitHub Token Active' : 'Configure GitHub Token (PAT)'}
          aria-label="GitHub Token Settings"
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#E35336')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = githubToken ? 'rgba(227,83,54,0.4)' : 'var(--border)')}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {githubToken && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E35336]" />
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border transition-all duration-150"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-muted)',
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#E35336';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(227,83,54,0.3)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
