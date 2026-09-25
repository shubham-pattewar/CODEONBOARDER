import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Sun, Moon, Layers, GitFork, Compass, Server,
  FolderGit2, X, ShieldCheck, Star, GitBranch, Package, Search,
  History, KeyRound,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ProgressStepper } from './ProgressStepper';

interface LandingPageProps {
  onAnalyze: (repoUrl: string) => void;
}

const exampleRepos = [
  {
    name: 'expressjs/express',
    url: 'https://github.com/expressjs/express',
    description: 'Fast, unopinionated web framework for Node.js',
    stars: '64.5k',
    tag: 'Node.js',
    icon: Package,
  },
  {
    name: 'remix-run/history',
    url: 'https://github.com/remix-run/history',
    description: 'Manage browser session history with JavaScript',
    stars: '5.2k',
    tag: 'TypeScript',
    icon: GitBranch,
  },
  {
    name: 'facebook/flux',
    url: 'https://github.com/facebook/flux',
    description: 'Application architecture for building user interfaces',
    stars: '12.4k',
    tag: 'React',
    icon: Layers,
  },
];

const features = [
  { icon: Layers,   label: 'Architecture', desc: 'Module grouping & cross-module deps' },
  { icon: GitFork,  label: 'File Flow',    desc: 'AST import graph with cycle detection' },
  { icon: Server,   label: 'Services',     desc: 'Docker Compose topology extraction' },
  { icon: Compass,  label: 'Start Here',   desc: 'Algorithmic guided reading order' },
];

/* Lightweight SVG graph nodes for background */
const BackgroundGraph: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none select-none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* grid dots */}
    <defs>
      <pattern id="grid-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.8" fill="currentColor" className="text-primary" opacity="0.08" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-dots)" />

    {/* Faint connection lines */}
    <g opacity="0.06" stroke="#E35336" strokeWidth="1" fill="none">
      <line x1="15%" y1="20%" x2="35%" y2="40%" />
      <line x1="35%" y1="40%" x2="60%" y2="30%" />
      <line x1="60%" y1="30%" x2="80%" y2="50%" />
      <line x1="35%" y1="40%" x2="50%" y2="60%" />
      <line x1="50%" y1="60%" x2="75%" y2="70%" />
      <line x1="20%" y1="65%" x2="50%" y2="60%" />
      <line x1="10%" y1="50%" x2="20%" y2="65%" />
    </g>

    {/* Faint node circles */}
    <g fill="#E35336" opacity="0.10">
      <circle cx="15%" cy="20%" r="4" />
      <circle cx="35%" cy="40%" r="5" />
      <circle cx="60%" cy="30%" r="4" />
      <circle cx="80%" cy="50%" r="4" />
      <circle cx="50%" cy="60%" r="6" />
      <circle cx="75%" cy="70%" r="4" />
      <circle cx="20%" cy="65%" r="4" />
      <circle cx="10%" cy="50%" r="3" />
    </g>
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onAnalyze }) => {
  const {
    theme, toggleTheme,
    jobStatus, jobProgress, jobMessage, jobError, resetToLanding,
    setHistoryOpen, setPatModalOpen, githubToken,
  } = useAppStore();

  const [repoUrl, setRepoUrl] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const validateAndSubmit = (url: string) => {
    const trimmed = url.trim();
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\.git)?\/?$/;
    if (!trimmed) {
      setValidationError('Enter a GitHub repository URL');
      return;
    }
    if (!githubRegex.test(trimmed)) {
      setValidationError('Must be a valid GitHub URL: https://github.com/owner/repo');
      return;
    }
    setValidationError('');
    onAnalyze(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndSubmit(repoUrl);
  };

  const isAnalyzing = jobStatus === 'cloning' || jobStatus === 'scanning' || jobStatus === 'building_graph' || jobStatus === 'error';

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <BackgroundGraph />
        {/* Warm ambient glow */}
        <div className="orb w-96 h-96 -top-24 -right-24 opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(227,83,54,0.12), transparent 70%)' }} />
        <div className="orb w-80 h-80 bottom-0 -left-16 opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(244,164,96,0.10), transparent 70%)', animationDelay: '-4s' }} />
      </div>

      {/* Top nav */}
      <header
        className="relative z-20 h-14 flex items-center justify-between px-6 border-b animate-fade-in-down"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', opacity: 0.97 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/codelogo.png"
            alt="Codebase Onboarder Logo"
            className="w-7 h-7 rounded-lg object-contain border border-white/10 shadow-sm"
          />
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Codebase Onboarder
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border hidden sm:inline"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
            v1.0
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* History modal trigger */}
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-150"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
            }}
            title="Browse past repository analyses"
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            <History className="w-3.5 h-3.5 text-[#E35336]" />
            <span className="hidden sm:inline">History</span>
          </button>

          {/* GitHub Token / PAT settings trigger */}
          <button
            onClick={() => setPatModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-150 relative"
            style={{
              borderColor: githubToken ? 'rgba(227,83,54,0.4)' : 'var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: githubToken ? '#E35336' : 'var(--text-secondary)',
            }}
            title={githubToken ? 'GitHub Token Active' : 'Configure GitHub Token (PAT)'}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#E35336')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = githubToken ? 'rgba(227,83,54,0.4)' : 'var(--border)')}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{githubToken ? 'Token Active' : 'PAT Token'}</span>
            {githubToken && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#E35336]" />
            )}
          </button>

          <div className="w-px h-4 hidden sm:block" style={{ backgroundColor: 'var(--border)' }} />

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md border transition-all duration-150"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        {isAnalyzing ? (
          <div className="w-full max-w-lg animate-scale-in">
            <ProgressStepper
              status={jobStatus}
              progress={jobProgress}
              message={jobMessage}
              error={jobError}
              onRetry={resetToLanding}
            />
          </div>
        ) : (
          <div className="w-full max-w-2xl space-y-10">
            {/* Hero */}
            <div className="text-center space-y-5">
              {/* Hero Logo with Ambient Halo */}
              <div className="flex justify-center mb-1 animate-fade-in-down">
                <div className="relative group cursor-pointer">
                  <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-[#E35336] via-[#F4A460] to-[#E35336] opacity-35 blur-lg group-hover:opacity-60 transition duration-500"></div>
                  <img
                    src="/codelogo.png"
                    alt="Codebase Onboarder Logo"
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain shadow-2xl border border-white/15 p-1.5 bg-[#181614] transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>

              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-widest border animate-fade-in-down"
                style={{
                  color: '#E35336',
                  borderColor: 'rgba(227,83,54,0.25)',
                  backgroundColor: 'rgba(227,83,54,0.06)',
                  animationDelay: '0ms',
                }}
              >
                Understand any codebase
              </div>

              {/* Headline */}
              <h1
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight animate-fade-in-up"
                style={{ color: 'var(--text-primary)', animationDelay: '80ms', animationFillMode: 'both' }}
              >
                Understand any codebase<br />
                <span className="shimmer-text">before you start coding.</span>
              </h1>

              {/* Sub */}
              <p
                className="text-sm sm:text-base leading-relaxed max-w-xl mx-auto animate-fade-in-up"
                style={{ color: 'var(--text-secondary)', animationDelay: '140ms', animationFillMode: 'both' }}
              >
                Analyze a public GitHub repository and instantly explore its architecture,
                dependencies, services, and recommended reading order.
              </p>
            </div>

            {/* URL Input */}
            <div
              className="animate-fade-in-up"
              style={{ animationDelay: '180ms', animationFillMode: 'both' }}
            >
              <form onSubmit={handleSubmit}>
                <div
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-xl border transition-all duration-200"
                  style={{
                    borderColor: isFocused ? '#E35336' : validationError ? '#dc2626' : 'var(--border-strong)',
                    backgroundColor: 'var(--surface)',
                    boxShadow: isFocused ? '0 0 0 3px rgba(227,83,54,0.12)' : 'none',
                  }}
                >
                  <div className="flex-1 flex items-center gap-2.5 px-3">
                    <FolderGit2
                      className="w-4 h-4 flex-shrink-0 transition-colors"
                      style={{ color: isFocused ? '#E35336' : 'var(--text-muted)' }}
                    />
                    <input
                      ref={inputRef}
                      type="url"
                      value={repoUrl}
                      onChange={e => { setRepoUrl(e.target.value); if (validationError) setValidationError(''); }}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="https://github.com/owner/repository"
                      className="w-full bg-transparent text-sm font-mono py-2.5 focus:outline-none placeholder:opacity-40"
                      style={{ color: 'var(--text-primary)' }}
                      aria-label="GitHub repository URL"
                      id="repo-url-input"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {repoUrl && (
                      <button
                        type="button"
                        onClick={() => { setRepoUrl(''); setValidationError(''); inputRef.current?.focus(); }}
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    id="analyze-button"
                    className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 active:scale-95"
                    style={{ backgroundColor: '#E35336' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F06448')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#E35336')}
                  >
                    <span>Analyze</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {validationError && (
                  <p className="text-xs mt-2 pl-1 animate-fade-in-up flex items-center gap-1.5" style={{ color: '#dc2626' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {validationError}
                  </p>
                )}
              </form>

              {/* Keyboard hint */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 rounded border font-mono text-[10px]"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                    ⌘K
                  </kbd>
                  <span>to focus ·</span>
                  <kbd className="px-1.5 py-0.5 rounded border font-mono text-[10px]"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                    Enter
                  </kbd>
                  <span>to analyze</span>
                </div>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="hover:underline text-[#E35336] flex items-center gap-1"
                >
                  <History className="w-3 h-3" />
                  <span>Browse Past Analyses</span>
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setPatModalOpen(true)}
                  className="hover:underline text-xs flex items-center gap-1"
                  style={{ color: githubToken ? '#22c55e' : 'var(--text-secondary)' }}
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{githubToken ? 'PAT Active' : 'Private Repo Token'}</span>
                </button>
              </div>
            </div>

            {/* Example repos */}
            <div className="animate-fade-in-up space-y-3" style={{ animationDelay: '220ms', animationFillMode: 'both' }}>
              <p className="text-[11px] font-medium uppercase tracking-widest text-center" style={{ color: 'var(--text-muted)' }}>
                Try an example
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {exampleRepos.map((repo, i) => {
                  const Icon = repo.icon;
                  return (
                    <button
                      key={repo.name}
                      type="button"
                      onClick={() => { setRepoUrl(repo.url); validateAndSubmit(repo.url); }}
                      className="group text-left p-3.5 rounded-xl border transition-all duration-150 animate-fade-in-up"
                      style={{
                        borderColor: 'var(--border)',
                        backgroundColor: 'var(--surface)',
                        animationDelay: `${220 + i * 60}ms`,
                        animationFillMode: 'both',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(227,83,54,0.35)';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-elevated)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface)';
                      }}
                      aria-label={`Analyze ${repo.name}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'rgba(227,83,54,0.10)' }}>
                            <Icon className="w-3 h-3" style={{ color: '#E35336' }} />
                          </div>
                          <span className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {repo.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          <Star className="w-2.5 h-2.5" />
                          <span className="font-mono text-[10px]">{repo.stars}</span>
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                        {repo.description}
                      </p>
                      <div className="mt-2.5 pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{repo.tag}</span>
                        <span className="text-[10px] font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: '#E35336' }}>
                          Analyze <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Features strip */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fade-in-up"
              style={{ animationDelay: '320ms', animationFillMode: 'both' }}
            >
              {features.map(f => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="text-center p-3 rounded-lg border"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-2"
                      style={{ backgroundColor: 'rgba(227,83,54,0.08)' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: '#E35336' }} />
                    </div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</div>
                    <div className="text-[10px] mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>{f.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="relative z-10 h-12 border-t flex items-center justify-between px-6 text-[11px]"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#E35336' }} />
          <span>Static analysis only — no code execution</span>
        </div>
        <span className="font-mono hidden sm:block" style={{ color: 'var(--text-muted)' }}>
          © 2024 Codebase Onboarder
        </span>
      </footer>
    </div>
  );
};
