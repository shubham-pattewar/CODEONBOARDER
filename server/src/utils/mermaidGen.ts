import { IAnalysisDocument } from '../models/Analysis';

export function generateMermaidDiagram(analysis: IAnalysisDocument): string {
  const safeId = (str: string) => str.replace(/[^a-zA-Z0-9_]/g, '_');

  let mmd = `graph TD\n`;
  mmd += `  %% Codebase Onboarder: ${analysis.owner}/${analysis.repo}\n`;
  mmd += `  classDef entry fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,color:#312e81;\n`;
  mmd += `  classDef service fill:#dcfce7,stroke:#10b981,stroke-width:2px,color:#065f46;\n`;
  mmd += `  classDef cycle fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b;\n`;
  mmd += `  classDef standard fill:#f1f5f9,stroke:#94a3b8,stroke-width:1px,color:#334155;\n\n`;

  // Render module subgraphs
  for (const mod of analysis.modules) {
    mmd += `  subgraph ${safeId(mod.id)}["${mod.name}"]\n`;
    for (const fileId of mod.files) {
      const node = analysis.nodes.find(n => n.id === fileId);
      if (node) {
        let cls = 'standard';
        if (node.isCycleMember) cls = 'cycle';
        else if (node.fileType === 'entry') cls = 'entry';
        else if (node.fileType === 'service') cls = 'service';

        mmd += `    ${safeId(node.id)}["${node.label}"]:::${cls}\n`;
      }
    }
    mmd += `  end\n\n`;
  }

  // Render edges (limit to 150 edges to prevent overwhelming Mermaid renderers)
  const edgesToRender = analysis.edges.slice(0, 150);
  for (const edge of edgesToRender) {
    if (edge.isCycle) {
      mmd += `  ${safeId(edge.source)} -.->|cycle| ${safeId(edge.target)}\n`;
    } else {
      mmd += `  ${safeId(edge.source)} --> ${safeId(edge.target)}\n`;
    }
  }

  return mmd;
}
