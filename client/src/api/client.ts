import axios from 'axios';
import type { AnalysisResult } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 45000,
});

export async function requestAnalysis(
  repoUrl: string,
  githubToken?: string,
  forceRefresh?: boolean
): Promise<{
  jobId: string;
  cached: boolean;
  analysisId?: string;
}> {
  const headers: Record<string, string> = {};
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }
  const res = await apiClient.post(
    '/analyze',
    { repoUrl, githubToken, forceRefresh },
    { headers }
  );
  return res.data;
}

export async function getJobStatus(jobId: string): Promise<{
  id: string;
  status: 'queued' | 'cloning' | 'scanning' | 'building_graph' | 'done' | 'error';
  progress: number;
  message: string;
  error?: string;
  analysisId?: string;
}> {
  const res = await apiClient.get(`/analyze/jobs/${jobId}`);
  return res.data;
}

export type JobUpdate = Awaited<ReturnType<typeof getJobStatus>>;

/** Opens the server's SSE job stream and returns a disposer for React cleanup. */
export function subscribeToJob(jobId: string, onUpdate: (job: JobUpdate) => void, onError: () => void): () => void {
  const source = new EventSource(`${API_BASE}/analyze/jobs/${encodeURIComponent(jobId)}/events`);
  source.onmessage = (event) => {
    const job = JSON.parse(event.data) as JobUpdate;
    onUpdate(job);
    if (job.status === 'done' || job.status === 'error') source.close();
  };
  source.onerror = () => {
    source.close();
    onError();
  };
  return () => source.close();
}

export async function fetchAnalysisResult(analysisId: string): Promise<AnalysisResult> {
  const res = await apiClient.get(`/analysis/${analysisId}`);
  return res.data;
}

export async function fetchMermaidExport(analysisId: string): Promise<string> {
  const res = await apiClient.get(`/analysis/${analysisId}/export`, {
    params: { format: 'mermaid' },
    responseType: 'text',
  });
  return res.data;
}
