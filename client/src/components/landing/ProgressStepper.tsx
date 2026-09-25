import React from 'react';
import { GitBranch, Scan, Network, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { JobStatus } from '../../types';

interface ProgressStepperProps {
  status: JobStatus;
  progress: number;
  message: string;
  error?: string | null;
  onRetry?: () => void;
}

const steps = [
  { key: 'cloning',       label: 'Cloning',       sub: 'Shallow clone depth=1',      icon: GitBranch },
  { key: 'scanning',      label: 'Scanning',      sub: 'File tree & language detect', icon: Scan },
  { key: 'building_graph',label: 'Building Graph', sub: 'AST import resolution',       icon: Network },
  { key: 'done',          label: 'Ready',         sub: 'Diagrams generated',          icon: CheckCircle2 },
];

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
  status, progress, message, error, onRetry,
}) => {
  const getState = (key: string) => {
    if (status === 'error') return 'error';
    const order = ['idle', 'cloning', 'scanning', 'building_graph', 'done'];
    const cur = order.indexOf(status);
    const step = order.indexOf(key);
    if (step < cur) return 'done';
    if (step === cur) return 'active';
    return 'pending';
  };

  const isError = status === 'error';
  const pct = Math.max(5, progress);

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      {/* Card */}
      <div
        className="rounded-xl border p-6 space-y-6 relative overflow-hidden"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5 transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: isError ? '#dc2626' : '#E35336',
          }}
        />

        {/* Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="flex items-center justify-center gap-2">
            {isError ? (
              <AlertCircle className="w-4 h-4" style={{ color: '#dc2626' }} />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#E35336' }} />
            )}
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isError ? 'Analysis Failed' : 'Analyzing Codebase'}
            </h3>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Generating architecture diagrams and dependency graphs
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div
            className="h-1.5 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out progress-shimmer"
              style={{
                width: `${isError ? 100 : pct}%`,
                backgroundColor: isError ? '#dc2626' : '#E35336',
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono truncate pr-3" style={{ color: 'var(--text-muted)' }}>
              {message || 'Starting analysis...'}
            </p>
            <span
              className="text-[11px] font-mono font-semibold flex-shrink-0"
              style={{ color: isError ? '#dc2626' : '#E35336' }}
            >
              {isError ? 'Error' : `${pct}%`}
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector */}
          <div
            className="absolute top-4 left-[12.5%] right-[12.5%] h-px"
            style={{ backgroundColor: 'var(--border)' }}
          />

          <div className="grid grid-cols-4 gap-2 relative">
            {steps.map(step => {
              const state = getState(step.key);
              const Icon = step.icon;
              const isActive = state === 'active';
              const isDone = state === 'done';

              return (
                <div key={step.key} className="flex flex-col items-center gap-2">
                  <div
                    className="relative w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10"
                    style={{
                      borderColor: isDone ? '#E35336' : isActive ? '#E35336' : 'var(--border)',
                      backgroundColor: isDone ? '#E35336' : isActive ? 'var(--surface)' : 'var(--surface-elevated)',
                      color: isDone ? 'white' : isActive ? '#E35336' : 'var(--text-muted)',
                    }}
                  >
                    {isActive ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <div
                          className="absolute inset-0 rounded-full border-2 animate-ping opacity-30"
                          style={{ borderColor: '#E35336' }}
                        />
                      </>
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="text-center space-y-0.5">
                    <div
                      className="text-[11px] font-semibold leading-tight transition-colors"
                      style={{
                        color: isActive ? '#E35336' : isDone ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {step.label}
                    </div>
                    <div className="hidden sm:block text-[9px]" style={{ color: 'var(--text-muted)' }}>
                      {step.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div
            className="p-3.5 rounded-lg border animate-fade-in-up space-y-3"
            style={{
              backgroundColor: 'rgba(220,38,38,0.06)',
              borderColor: 'rgba(220,38,38,0.25)',
            }}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#dc2626' }} />
              <p className="text-xs font-semibold" style={{ color: '#dc2626' }}>Analysis failed</p>
            </div>
            <p className="text-[11px] pl-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {error || 'Unable to analyze this repository. Please ensure it is a valid public GitHub repository.'}
            </p>
            {onRetry && (
              <div className="pl-6">
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150"
                  style={{
                    borderColor: 'rgba(220,38,38,0.3)',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--surface-elevated)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#dc2626')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)')}
                >
                  ← Try a different URL
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hint */}
      {!isError && (
        <p className="text-center text-[11px] mt-3 animate-pulse" style={{ color: 'var(--text-muted)' }}>
          Usually takes 20–60 seconds depending on repository size
        </p>
      )}
    </div>
  );
};
