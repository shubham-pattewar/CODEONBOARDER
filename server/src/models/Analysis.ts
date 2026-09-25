import mongoose, { Schema, Document } from 'mongoose';

export interface IFileNode {
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

export interface IDependencyEdge {
  id: string;
  source: string;
  target: string;
  isCycle?: boolean;
}

export interface IServiceDefinition {
  name: string;
  type: 'docker-service' | 'workspace-package' | 'entry-app';
  path?: string;
  image?: string;
  ports?: string[];
  dependsOn?: string[];
  envKeys?: string[];
}

export interface IReadingOrderItem {
  rank: number;
  path: string;
  reason: string;
  summary?: string;
}

export interface IModuleGroup {
  id: string;
  name: string;
  files: string[];
  dependencies: string[];
}

export interface IAnalysisDocument extends Document {
  repoUrl: string;
  owner: string;
  repo: string;
  commitSha: string;
  branch: string;
  createdAt: Date;
  metadata: {
    primaryLanguage: string;
    totalFiles: number;
    frameworks: string[];
    isNonJsTs: boolean;
  };
  fileTree: any;
  nodes: IFileNode[];
  edges: IDependencyEdge[];
  modules: IModuleGroup[];
  services: IServiceDefinition[];
  entryPoints: string[];
  cycles: string[][];
  readingOrder: IReadingOrderItem[];
}

const FileNodeSchema = new Schema<IFileNode>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  path: { type: String, required: true },
  language: { type: String, required: true },
  fileType: { 
    type: String, 
    enum: ['entry', 'service', 'module', 'test', 'config', 'component', 'util'], 
    default: 'module' 
  },
  sizeBytes: { type: Number, default: 0 },
  folder: { type: String, default: '' },
  imports: [{ type: String }],
  importedBy: [{ type: String }],
  inDegree: { type: Number, default: 0 },
  outDegree: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
  isCycleMember: { type: Boolean, default: false },
  summary: { type: String },
}, { _id: false });

const DependencyEdgeSchema = new Schema<IDependencyEdge>({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  isCycle: { type: Boolean, default: false },
}, { _id: false });

const ServiceDefinitionSchema = new Schema<IServiceDefinition>({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['docker-service', 'workspace-package', 'entry-app'], 
    required: true 
  },
  path: { type: String },
  image: { type: String },
  ports: [{ type: String }],
  dependsOn: [{ type: String }],
  envKeys: [{ type: String }],
}, { _id: false });

const ReadingOrderItemSchema = new Schema<IReadingOrderItem>({
  rank: { type: Number, required: true },
  path: { type: String, required: true },
  reason: { type: String, required: true },
  summary: { type: String },
}, { _id: false });

const ModuleGroupSchema = new Schema<IModuleGroup>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  files: [{ type: String }],
  dependencies: [{ type: String }],
}, { _id: false });

const AnalysisSchema = new Schema<IAnalysisDocument>({
  repoUrl: { type: String, required: true, index: true },
  owner: { type: String, required: true },
  repo: { type: String, required: true },
  commitSha: { type: String, required: true },
  branch: { type: String, default: 'main' },
  createdAt: { type: Date, default: Date.now },
  metadata: {
    primaryLanguage: { type: String, default: 'JavaScript' },
    totalFiles: { type: Number, default: 0 },
    frameworks: [{ type: String }],
    isNonJsTs: { type: Boolean, default: false },
  },
  fileTree: { type: Schema.Types.Mixed },
  nodes: [FileNodeSchema],
  edges: [DependencyEdgeSchema],
  modules: [ModuleGroupSchema],
  services: [ServiceDefinitionSchema],
  entryPoints: [{ type: String }],
  cycles: [[{ type: String }]],
  readingOrder: [ReadingOrderItemSchema],
});

// Compound index for caching
AnalysisSchema.index({ repoUrl: 1, commitSha: 1 }, { unique: true });

export const Analysis = mongoose.model<IAnalysisDocument>('Analysis', AnalysisSchema);
