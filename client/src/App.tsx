import React, { useEffect, useRef } from 'react';
import { useAppStore } from './store/useAppStore';
import { TopBar } from './components/layout/TopBar';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { RightDetailsPanel } from './components/layout/RightDetailsPanel';
import { LandingPage } from './components/landing/LandingPage';
import { GraphCanvas } from './components/canvas/GraphCanvas';
import { CommandPalette } from './components/layout/CommandPalette';
import { HistoryModal } from './components/layout/HistoryModal';
import { PatModal } from './components/layout/PatModal';
import { requestAnalysis, getJobStatus, fetchAnalysisResult, fetchMermaidExport, subscribeToJob, API_BASE } from './api/client';
import { exportCanvasAsPng, exportCanvasAsSvg, downloadTextFile } from './utils/exportDiagram';

export const App: React.FC = () => {
  const {
    theme,
    analysis,
    jobStatus,
    setJobProgress,
    setAnalysis,
    githubToken,
  } = useAppStore();

  const closeJobStream = useRef<(() => void) | null>(null);

  // Apply theme class to <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sync shareable URL hash: Load analysis if URL contains #/analysis/:slug or #/analysis/:id
  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash;
      const match = hash.match(/^#\/analysis\/(.+)/);
      if (match && match[1]) {
        const targetSlug = decodeURIComponent(match[1].trim());
        const currentSlug = analysis?.owner && analysis?.repo ? `${analysis.owner}/${analysis.repo}` : (analysis?._id || analysis?.id);
        if (currentSlug === targetSlug || analysis?.repo?.toLowerCase() === targetSlug.toLowerCase()) return;

        try {
          setJobProgress('building_graph', 50, 'Loading workspace...');
          const data = await fetchAnalysisResult(targetSlug);
          setAnalysis(data);
          setJobProgress('done', 100, 'Loaded analysis!');
        } catch (err: any) {
          // If not cached yet, but it looks like an owner/repo slug, automatically trigger analysis!
          if (targetSlug.includes('/') && !targetSlug.startsWith('mem_')) {
            handleAnalyze(`https://github.com/${targetSlug}`);
          } else {
            console.error('Failed to load shared analysis:', err);
            setJobProgress('error', 0, 'Could not find shared analysis');
          }
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [analysis]);

  // Cleanup SSE on unmount
  useEffect(() => () => closeJobStream.current?.(), []);

  const handleAnalyze = async (url: string, forceRefresh = false) => {
    try {
      closeJobStream.current?.();
      setJobProgress('cloning', 10, forceRefresh ? 'Forcing refresh from GitHub...' : 'Initiating repository analysis...');

      const response = await requestAnalysis(url, githubToken, forceRefresh);

      if (response.cached && response.analysisId && !forceRefresh) {
        setJobProgress('building_graph', 100, 'Loading cached workspace...');
        const data = await fetchAnalysisResult(response.analysisId);
        setAnalysis(data);
        setJobProgress('done', 100, 'Loaded from cache!');
        return;
      }

      const jobId = response.jobId;

      const applyUpdate = async (job: Awaited<ReturnType<typeof getJobStatus>>) => {
        if (job.status === 'done' && job.analysisId) {
          closeJobStream.current?.();
          setJobProgress('building_graph', 100, 'Opening interactive workspace...');
          try {
            const data = await fetchAnalysisResult(job.analysisId);
            setAnalysis(data);
            setJobProgress('done', 100, 'Analysis complete!');
          } catch (err: any) {
            setJobProgress('error', 0, 'Failed to load analysis result', err.message);
          }
          return;
        }
        setJobProgress(job.status, job.progress, job.message, job.error);
      };

      closeJobStream.current = subscribeToJob(jobId, applyUpdate, () => {
        const interval = window.setInterval(async () => {
          try {
            const job = await getJobStatus(jobId);
            await applyUpdate(job);
            if (job.status === 'done' || job.status === 'error') clearInterval(interval);
          } catch (err: any) {
            clearInterval(interval);
            setJobProgress('error', 0, 'Polling error', err.message);
          }
        }, 1200);
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err.message;
      const isLocalhostOnProd = typeof window !== 'undefined' && 
        window.location.hostname !== 'localhost' && 
        API_BASE.includes('localhost');

      let userMsg = errorMsg;
      if (isLocalhostOnProd) {
        userMsg = `Frontend is currently pointing to http://localhost:4000 instead of your deployed Render backend. Add VITE_API_BASE=https://<your-render-url>/api in Vercel settings and Redeploy.`;
      } else if (err.code === 'ERR_NETWORK' || errorMsg?.includes('Network Error')) {
        userMsg = `Cannot connect to backend (${API_BASE}). If Render free tier was sleeping, it may take ~50 seconds to wake up. Please click "Try again".`;
      } else if (err.code === 'ECONNABORTED' || errorMsg?.includes('timeout')) {
        userMsg = `Backend request timed out. If Render free tier was sleeping, it is waking up now. Please click "Try again".`;
      }
      setJobProgress('error', 0, 'Connection failed', userMsg);
    }
  };

  const handleExportPng = async () => {
    try {
      await exportCanvasAsPng(`${analysis?.repo || 'codebase'}-architecture.png`);
    } catch (e: any) {
      alert('Could not export PNG: ' + e.message);
    }
  };

  const handleExportSvg = async () => {
    try {
      await exportCanvasAsSvg(`${analysis?.repo || 'codebase'}-architecture.svg`);
    } catch (e: any) {
      alert('Could not export SVG: ' + e.message);
    }
  };

  const handleExportMermaid = async () => {
    if (!analysis) return;
    try {
      let mmd = '';
      const analysisId = analysis._id || analysis.id;
      if (analysisId) mmd = await fetchMermaidExport(analysisId);
      if (!mmd) {
        mmd = `graph TD\n`;
        analysis.nodes.slice(0, 50).forEach(n => {
          n.imports.forEach(imp => {
            mmd += `  ${n.label.replace(/\./g, '_')} --> ${imp.split('/').pop()?.replace(/\./g, '_')}\n`;
          });
        });
      }
      navigator.clipboard.writeText(mmd);
      downloadTextFile(mmd, `${analysis.repo}-architecture.mmd`);
      alert('Mermaid diagram copied to clipboard & downloaded!');
    } catch (e: any) {
      alert('Error exporting Mermaid: ' + e.message);
    }
  };

  const showWorkspace = analysis !== null && jobStatus === 'done';

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col font-sans"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {showWorkspace ? (
        <>
          <TopBar
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
            onExportMermaid={handleExportMermaid}
            onReanalyze={() => analysis && handleAnalyze(analysis.repoUrl, true)}
          />
          <div className="flex-1 flex overflow-hidden">
            <LeftSidebar />
            <main className="flex-1 flex flex-col relative overflow-hidden">
              <GraphCanvas />
            </main>
            <RightDetailsPanel />
          </div>
          <CommandPalette />
        </>
      ) : (
        <LandingPage onAnalyze={handleAnalyze} />
      )}

      {/* Global Modals */}
      <HistoryModal />
      <PatModal />
    </div>
  );
};

export default App;
