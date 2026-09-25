import { IFileNode, IDependencyEdge, IModuleGroup, IReadingOrderItem } from '../models/Analysis';

export interface GraphBuildResult {
  nodes: IFileNode[];
  edges: IDependencyEdge[];
  modules: IModuleGroup[];
  cycles: string[][];
  readingOrder: IReadingOrderItem[];
}

/**
 * Builds the graph, calculates in/out degree, detects cycles, groups modules, and ranks reading order.
 */
export function buildGraph(
  nodes: IFileNode[],
  rawEdges: { source: string; target: string }[],
  entryPointsList: string[]
): GraphBuildResult {
  const nodeMap = new Map<string, IFileNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const validEdgesMap = new Map<string, IDependencyEdge>();

  // Filter edges to only known internal nodes
  for (const edge of rawEdges) {
    if (edge.source === edge.target) continue; // Skip self references
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;

    const edgeId = `${edge.source}->${edge.target}`;
    if (!validEdgesMap.has(edgeId)) {
      validEdgesMap.set(edgeId, {
        id: edgeId,
        source: edge.source,
        target: edge.target,
        isCycle: false,
      });

      const sourceNode = nodeMap.get(edge.source)!;
      const targetNode = nodeMap.get(edge.target)!;

      if (!sourceNode.imports.includes(edge.target)) {
        sourceNode.imports.push(edge.target);
      }
      if (!targetNode.importedBy.includes(edge.source)) {
        targetNode.importedBy.push(edge.source);
      }
    }
  }

  // Calculate degrees
  for (const node of nodes) {
    node.outDegree = node.imports.length;
    node.inDegree = node.importedBy.length;
  }

  // Cycle detection via DFS
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycleEdges = new Set<string>();

  function dfsCycle(nodeId: string, path: string[]) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = nodeMap.get(nodeId);
    if (node) {
      for (const neighbor of node.imports) {
        if (!visited.has(neighbor)) {
          dfsCycle(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Cycle found!
          const cycleStartIndex = path.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            const cyclePath = path.slice(cycleStartIndex);
            cyclePath.push(neighbor);
            cycles.push(cyclePath);

            // Mark nodes and edges
            for (let i = 0; i < cyclePath.length - 1; i++) {
              const u = cyclePath[i];
              const v = cyclePath[i + 1];
              const edgeKey = `${u}->${v}`;
              cycleEdges.add(edgeKey);
              if (nodeMap.has(u)) nodeMap.get(u)!.isCycleMember = true;
              if (nodeMap.has(v)) nodeMap.get(v)!.isCycleMember = true;
            }
          }
        }
      }
    }

    recursionStack.delete(nodeId);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfsCycle(node.id, []);
    }
  }

  // Update edges with isCycle
  const edges: IDependencyEdge[] = Array.from(validEdgesMap.values()).map(edge => ({
    ...edge,
    isCycle: cycleEdges.has(edge.id),
  }));

  // Group modules by folder
  const folderMap = new Map<string, Set<string>>();
  for (const node of nodes) {
    const parts = node.path.split('/');
    let folder = parts.length > 1 ? parts.slice(0, Math.min(parts.length - 1, 2)).join('/') : 'root';
    if (!folderMap.has(folder)) {
      folderMap.set(folder, new Set());
    }
    folderMap.get(folder)!.add(node.id);
  }

  const modules: IModuleGroup[] = [];
  for (const [folder, fileSet] of folderMap.entries()) {
    const fileArray = Array.from(fileSet);
    const depModules = new Set<string>();

    for (const fileId of fileArray) {
      const node = nodeMap.get(fileId);
      if (node) {
        for (const imp of node.imports) {
          const impParts = imp.split('/');
          const impFolder = impParts.length > 1 ? impParts.slice(0, Math.min(impParts.length - 1, 2)).join('/') : 'root';
          if (impFolder !== folder) {
            depModules.add(impFolder);
          }
        }
      }
    }

    modules.push({
      id: folder,
      name: folder === 'root' ? 'Root Files' : folder,
      files: fileArray,
      dependencies: Array.from(depModules),
    });
  }

  // Rank reading order (top 10 files)
  const scoredNodes = nodes.map(node => {
    let score = 0;

    // Entry point gets priority
    if (node.fileType === 'entry' || entryPointsList.includes(node.path)) {
      score += 100;
    }

    // High in-degree = heavily relied upon
    score += node.inDegree * 10;

    // Out-degree = central orchestrator
    score += node.outDegree * 2;

    // Demote test, config, and markdown/docs
    if (node.fileType === 'test') score -= 200;
    if (node.fileType === 'config') score -= 50;
    if (node.language === 'markdown' || node.language === 'plaintext' || node.path.startsWith('docs/')) score -= 150;

    node.rank = score;
    return { node, score };
  });

  scoredNodes.sort((a, b) => b.score - a.score);

  const readingOrder: IReadingOrderItem[] = scoredNodes
    .slice(0, 10)
    .map((item, index) => {
      const n = item.node;
      let reason = '';

      if (n.fileType === 'entry' || entryPointsList.includes(n.path)) {
        reason = `Application Entry Point: initializes key processes`;
      } else if (n.inDegree >= 5) {
        reason = `Core dependency imported by ${n.inDegree} files`;
      } else if (n.inDegree > 0 && n.outDegree > 0) {
        reason = `Key coordinator: connects ${n.inDegree} callers to ${n.outDegree} modules`;
      } else if (n.inDegree > 0) {
        reason = `Essential module used by ${n.inDegree} components`;
      } else {
        reason = `High-level orchestration module`;
      }

      return {
        rank: index + 1,
        path: n.path,
        reason,
        summary: n.summary,
      };
    });

  return {
    nodes,
    edges,
    modules,
    cycles,
    readingOrder,
  };
}
