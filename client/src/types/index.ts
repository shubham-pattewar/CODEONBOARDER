export type ViewMode = 'architecture' | 'file-flow' | 'services' | 'start-here';

export type JobStatus = 'idle' | 'queued' | 'cloning' | 'scanning' | 'building_graph' | 'done' | 'error';

export interface FileNodeData {
  id: string;
  label: string;
  path: string;
  language: string;
  fileType: 'entry' | 'service' | 'module' | 'test' | 'config' | 'component' | 'util';
  sizeBytes: number;
  folder: string;
  imports: string[];
  importedBy: string[];
  inDegree: number;
  outDegree: number;
  rank: number;
  isCycleMember: boolean;
  summary?: string;
}

export interface DependencyEdgeData {
  id: string;
  source: string;
  target: string;
  isCycle?: boolean;
}

export interface ServiceDefinition {
  name: string;
  type: 'docker-service' | 'workspace-package' | 'entry-app';
  path?: string;
  image?: string;
  ports?: string[];
  dependsOn?: string[];
  envKeys?: string[];
}

export interface ReadingOrderItem {
  rank: number;
  path: string;
  reason: string;
  summary?: string;
}

export interface ModuleGroup {
  id: string;
  name: string;
  files: string[];
  dependencies: string[];
}

export interface AnalysisResult {
  id?: string;
  _id?: string;
  repoUrl: string;
  owner: string;
  repo: string;
  commitSha: string;
  branch: string;
  createdAt: string;
  metadata: {
    primaryLanguage: string;
    totalFiles: number;
    frameworks: string[];
    isNonJsTs: boolean;
  };
  fileTree: any;
  nodes: FileNodeData[];
  edges: DependencyEdgeData[];
  modules: ModuleGroup[];
  services: ServiceDefinition[];
  entryPoints: string[];
  cycles: string[][];
  readingOrder: ReadingOrderItem[];
}

export interface HistoryItem {
  id: string;
  repoUrl: string;
  owner: string;
  repo: string;
  commitSha: string;
  branch: string;
  createdAt: string;
  primaryLanguage: string;
  totalFiles: number;
  nodesCount: number;
  edgesCount: number;
  servicesCount: number;
  frameworks: string[];
}

export interface FilterState {
  hideTests: boolean;
  hideConfig: boolean;
  hideModulesLike: boolean;
  searchQuery: string;
}
