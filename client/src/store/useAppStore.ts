import { create } from 'zustand';
import type { ViewMode, JobStatus, AnalysisResult, FilterState } from '../types';


interface AppState {
  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // View Mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  layoutDirection: 'LR' | 'TB';
  toggleLayoutDirection: () => void;

  // Analysis / Job State
  jobStatus: JobStatus;
  jobProgress: number;
  jobMessage: string;
  jobError: string | null;
  activeJobId: string | null;
  analysis: AnalysisResult | null;
  
  // Selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // UI Panels
  sidebarOpen: boolean;
  detailsPanelOpen: boolean;
  commandPaletteOpen: boolean;
  historyOpen: boolean;
  patModalOpen: boolean;
  toggleSidebar: () => void;
  toggleDetailsPanel: () => void;
  setSidebarOpen: (open: boolean) => void;
  setDetailsPanelOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setPatModalOpen: (open: boolean) => void;

  // Auth / PAT
  githubToken: string;
  setGithubToken: (token: string) => void;

  // Filters
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;

  // Job Actions
  setJobProgress: (status: JobStatus, progress: number, message: string, error?: string | null) => void;
  setAnalysis: (analysis: AnalysisResult | null) => void;
  updateNodeSummary: (filePath: string, summary: string) => void;
  resetToLanding: () => void;
}

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('co-theme') as 'dark' | 'light' | null;
    if (saved) return saved;
  }
  return 'dark'; // Dark is always default
};

const getInitialToken = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('co-github-pat') || '';
  }
  return '';
};

export const useAppStore = create<AppState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    localStorage.setItem('co-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('co-theme', next);
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: next };
    }),

  viewMode: 'architecture',
  setViewMode: (viewMode) => set({ viewMode }),
  layoutDirection: 'LR',
  toggleLayoutDirection: () => set((state) => ({ layoutDirection: state.layoutDirection === 'LR' ? 'TB' : 'LR' })),

  jobStatus: 'idle',
  jobProgress: 0,
  jobMessage: '',
  jobError: null,
  activeJobId: null,
  analysis: null,

  selectedNodeId: null,
  setSelectedNodeId: (selectedNodeId) => {
    set({ selectedNodeId });
    if (selectedNodeId) {
      set({ detailsPanelOpen: true });
    }
  },

  sidebarOpen: true,
  detailsPanelOpen: true,
  commandPaletteOpen: false,
  historyOpen: false,
  patModalOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDetailsPanel: () => set((state) => ({ detailsPanelOpen: !state.detailsPanelOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setDetailsPanelOpen: (detailsPanelOpen) => set({ detailsPanelOpen }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
  setPatModalOpen: (patModalOpen) => set({ patModalOpen }),

  githubToken: getInitialToken(),
  setGithubToken: (githubToken) => {
    if (typeof window !== 'undefined') {
      if (githubToken) {
        localStorage.setItem('co-github-pat', githubToken);
      } else {
        localStorage.removeItem('co-github-pat');
      }
    }
    set({ githubToken });
  },

  filters: {
    hideTests: false,
    hideConfig: false,
    hideModulesLike: true,
    searchQuery: '',
  },
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () =>
    set({
      filters: {
        hideTests: false,
        hideConfig: false,
        hideModulesLike: true,
        searchQuery: '',
      },
    }),

  setJobProgress: (jobStatus, jobProgress, jobMessage, jobError = null) =>
    set({ jobStatus, jobProgress, jobMessage, jobError }),

  setAnalysis: (analysis) => {
    if (analysis) {
      const slug = (analysis.owner && analysis.repo)
        ? `${analysis.owner}/${analysis.repo}`
        : (analysis.repo || analysis._id || analysis.id);
      if (slug && typeof window !== 'undefined') {
        window.location.hash = `/analysis/${slug}`;
      }
    }
    set({
      analysis,
      jobStatus: analysis ? 'done' : 'idle',
      selectedNodeId: analysis?.readingOrder?.[0]?.path || analysis?.nodes?.[0]?.id || null,
    });
  },

  updateNodeSummary: (filePath, summary) =>
    set((state) => {
      if (!state.analysis) return state;
      const updatedNodes = (state.analysis.nodes || []).map((node) =>
        node.id === filePath ? { ...node, summary } : node
      );
      const updatedReading = (state.analysis.readingOrder || []).map((item) =>
        item.path === filePath ? { ...item, summary } : item
      );
      return {
        analysis: {
          ...state.analysis,
          nodes: updatedNodes,
          readingOrder: updatedReading,
        },
      };
    }),

  resetToLanding: () => {
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
    set({
      analysis: null,
      jobStatus: 'idle',
      jobProgress: 0,
      jobMessage: '',
      jobError: null,
      activeJobId: null,
      selectedNodeId: null,
    });
  },
}));
