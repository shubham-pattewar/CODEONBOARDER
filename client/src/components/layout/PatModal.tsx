import React, { useState, useEffect } from 'react';
import { KeyRound, X, Check, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const PatModal: React.FC = () => {
  const { patModalOpen, setPatModalOpen, githubToken, setGithubToken } = useAppStore();
  const [tokenInput, setTokenInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (patModalOpen) {
      setTokenInput(githubToken);
      setSavedSuccess(false);
    }
  }, [patModalOpen, githubToken]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && patModalOpen) {
        setPatModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patModalOpen, setPatModalOpen]);

  if (!patModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGithubToken(tokenInput.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setPatModalOpen(false);
    }, 900);
  };

  const handleClear = () => {
    setGithubToken('');
    setTokenInput('');
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setPatModalOpen(false);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setPatModalOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border flex flex-col shadow-2xl overflow-hidden animate-scale-in"
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
              <KeyRound className="w-4 h-4" style={{ color: '#E35336' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">GitHub Access Token</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Private repos & higher API rate limits
              </p>
            </div>
          </div>

          <button
            onClick={() => setPatModalOpen(false)}
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

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_... or github_pat_..."
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono focus:outline-none"
              style={{
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
            <p className="text-[11px] leading-relaxed pt-1" style={{ color: 'var(--text-muted)' }}>
              Needed to clone private repositories or bypass public IP rate limits. Tokens are stored locally in your browser and never retained after your analysis.
            </p>
          </div>

          <div
            className="p-3 rounded-xl border flex items-start gap-2.5 text-xs"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E35336' }} />
            <div className="space-y-1">
              <span className="font-medium">Required scope for private repos:</span>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Classic token requires <code className="px-1 py-0.5 rounded border text-[10px]" style={{ borderColor: 'var(--border)' }}>repo</code> scope. Fine-grained requires Read access to Contents and Metadata.
              </p>
            </div>
          </div>

          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=Codebase+Onboarder"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E35336] hover:underline"
          >
            <span>Generate a token on GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            {githubToken ? (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Token</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPatModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--surface-elevated)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                style={{ backgroundColor: '#E35336' }}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Token</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
