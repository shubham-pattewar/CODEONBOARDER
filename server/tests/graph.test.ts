import { describe, it, expect } from 'vitest';
import { buildGraph } from '../src/pipeline/graph';
import { IFileNode } from '../src/models/Analysis';

describe('Dependency Graph and Ranking', () => {
  const mockNodes: IFileNode[] = [
    {
      id: 'src/index.ts',
      label: 'index.ts',
      path: 'src/index.ts',
      language: 'typescript',
      fileType: 'entry',
      sizeBytes: 1000,
      folder: 'src',
      imports: [],
      importedBy: [],
      inDegree: 0,
      outDegree: 0,
      rank: 0,
      isCycleMember: false,
    },
    {
      id: 'src/app.ts',
      label: 'app.ts',
      path: 'src/app.ts',
      language: 'typescript',
      fileType: 'module',
      sizeBytes: 1200,
      folder: 'src',
      imports: [],
      importedBy: [],
      inDegree: 0,
      outDegree: 0,
      rank: 0,
      isCycleMember: false,
    },
    {
      id: 'src/utils/helper.ts',
      label: 'helper.ts',
      path: 'src/utils/helper.ts',
      language: 'typescript',
      fileType: 'util',
      sizeBytes: 800,
      folder: 'src/utils',
      imports: [],
      importedBy: [],
      inDegree: 0,
      outDegree: 0,
      rank: 0,
      isCycleMember: false,
    },
    {
      id: 'src/circularA.ts',
      label: 'circularA.ts',
      path: 'src/circularA.ts',
      language: 'typescript',
      fileType: 'module',
      sizeBytes: 500,
      folder: 'src',
      imports: [],
      importedBy: [],
      inDegree: 0,
      outDegree: 0,
      rank: 0,
      isCycleMember: false,
    },
    {
      id: 'src/circularB.ts',
      label: 'circularB.ts',
      path: 'src/circularB.ts',
      language: 'typescript',
      fileType: 'module',
      sizeBytes: 500,
      folder: 'src',
      imports: [],
      importedBy: [],
      inDegree: 0,
      outDegree: 0,
      rank: 0,
      isCycleMember: false,
    },
  ];

  it('correctly builds edges and computes in-degree and out-degree', () => {
    const rawEdges = [
      { source: 'src/index.ts', target: 'src/app.ts' },
      { source: 'src/app.ts', target: 'src/utils/helper.ts' },
    ];

    const result = buildGraph([...mockNodes.map(n => ({ ...n }))], rawEdges, ['src/index.ts']);

    const indexNode = result.nodes.find(n => n.id === 'src/index.ts')!;
    const appNode = result.nodes.find(n => n.id === 'src/app.ts')!;
    const helperNode = result.nodes.find(n => n.id === 'src/utils/helper.ts')!;

    expect(indexNode.outDegree).toBe(1);
    expect(indexNode.inDegree).toBe(0);
    expect(appNode.outDegree).toBe(1);
    expect(appNode.inDegree).toBe(1);
    expect(helperNode.inDegree).toBe(1);
    expect(helperNode.outDegree).toBe(0);
  });

  it('detects circular dependencies and flags cycle members', () => {
    const rawEdges = [
      { source: 'src/circularA.ts', target: 'src/circularB.ts' },
      { source: 'src/circularB.ts', target: 'src/circularA.ts' },
    ];

    const result = buildGraph([...mockNodes.map(n => ({ ...n }))], rawEdges, []);

    expect(result.cycles.length).toBeGreaterThan(0);
    const nodeA = result.nodes.find(n => n.id === 'src/circularA.ts')!;
    const nodeB = result.nodes.find(n => n.id === 'src/circularB.ts')!;

    expect(nodeA.isCycleMember).toBe(true);
    expect(nodeB.isCycleMember).toBe(true);
  });

  it('ranks entry point as #1 in reading order with descriptive reason', () => {
    const rawEdges = [
      { source: 'src/index.ts', target: 'src/app.ts' },
      { source: 'src/app.ts', target: 'src/utils/helper.ts' },
    ];

    const result = buildGraph([...mockNodes.map(n => ({ ...n }))], rawEdges, ['src/index.ts']);

    expect(result.readingOrder[0].path).toBe('src/index.ts');
    expect(result.readingOrder[0].reason).toContain('Application Entry Point');
  });

  it('groups modules by directory structure', () => {
    const rawEdges = [
      { source: 'src/index.ts', target: 'src/utils/helper.ts' },
    ];

    const result = buildGraph([...mockNodes.map(n => ({ ...n }))], rawEdges, []);
    const utilsModule = result.modules.find(m => m.id === 'src/utils');

    expect(utilsModule).toBeDefined();
    expect(utilsModule?.files).toContain('src/utils/helper.ts');
  });
});
