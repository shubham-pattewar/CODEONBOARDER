import { config } from '../config';
import { IFileNode, IReadingOrderItem } from '../models/Analysis';

/**
 * Heuristic architectural summary generator for when Gemini API key is absent or rate-limited.
 */
export function generateHeuristicSummary(node: { path: string; fileType: string; language: string; inDegree?: number; outDegree?: number }): string {
  const p = node.path.toLowerCase();
  const base = node.path.split('/').pop() || node.path;

  if (node.fileType === 'entry') {
    return `Application entry point initializing core runtime, bootstrapping configurations, and mounting primary handlers (${base}).`;
  }
  if (node.fileType === 'service' || p.includes('/services/')) {
    return `Business logic service managing operational domain tasks, database interactions, and workflow coordination.`;
  }
  if (p.includes('/controllers/') || p.includes('/routes/') || p.includes('/api/')) {
    return `API routing module defining HTTP endpoints, request validation, and orchestrating responses.`;
  }
  if (p.includes('/models/') || p.includes('/schemas/')) {
    return `Data model schema defining structure, database mapping, and data validation rules for this domain entity.`;
  }
  if (node.fileType === 'component' || p.includes('/components/')) {
    return `Reusable UI component rendering visual presentation and handling user interactions within the interface.`;
  }
  if (p.includes('/store/') || p.includes('/state/') || p.includes('/context/')) {
    return `Application state management module managing shared reactive store, dispatchers, and state subscriptions.`;
  }
  if (node.fileType === 'util' || p.includes('/utils/') || p.includes('/helpers/')) {
    return `Utility module providing reusable helper functions, formatting, and common transformations.`;
  }
  if (node.fileType === 'config' || p.includes('.config.') || p.endsWith('.json') || p.endsWith('.yml')) {
    return `Configuration manifest defining build settings, runtime options, or deployment environments.`;
  }
  if (node.fileType === 'test' || p.includes('.test.') || p.includes('.spec.')) {
    return `Automated test suite verifying functional specifications, regressions, and component assertions.`;
  }
  if ((node.inDegree || 0) > 3) {
    return `High-centrality module heavily imported across the codebase (${node.inDegree} incoming dependencies).`;
  }
  if ((node.outDegree || 0) > 3) {
    return `Coordination module orchestrating dependencies across ${node.outDegree} imported modules.`;
  }
  return `Source module implementing domain logic and utility routines for ${base}.`;
}

/**
 * Generates summaries for all files in the repository.
 * Batches requests to avoid token limits.
 */
export async function enrichWithAiSummaries(
  nodes: IFileNode[],
  readingOrder: IReadingOrderItem[]
): Promise<void> {
  // Always assign intelligent heuristic summaries first so every file is covered
  for (const node of nodes) {
    if (!node.summary) {
      node.summary = generateHeuristicSummary(node);
    }
  }
  for (const item of readingOrder) {
    if (!item.summary) {
      const match = nodes.find(n => n.id === item.path);
      item.summary = match?.summary || generateHeuristicSummary({ path: item.path, fileType: 'module', language: 'typescript' });
    }
  }

  if (!config.llmApiKey) {
    return;
  }

  // If Gemini API is configured, upgrade summaries in chunks of 15 files
  try {
    const chunkSize = 15;
    const allPaths = nodes.map(n => n.path);

    for (let i = 0; i < allPaths.length; i += chunkSize) {
      const chunk = allPaths.slice(i, i + chunkSize);
      const promptFiles = chunk.join(', ');

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${config.llmModel}:generateContent?key=${config.llmApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Provide a concise 1-2 sentence plain-English architectural summary for each of these source files in a software repository: ${promptFiles}. Format output as JSON: { "summaries": { "filepath": "1-2 sentence summary" } }`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              const summaries = parsed.summaries || {};

              for (const node of nodes) {
                if (summaries[node.path]) {
                  node.summary = summaries[node.path];
                }
              }

              for (const item of readingOrder) {
                if (summaries[item.path]) {
                  item.summary = summaries[item.path];
                }
              }
            }
          }
        }
      } catch (chunkErr) {
        // Continue to next chunk if one fails
      }
    }
  } catch (err: any) {
    console.warn('[aiSummarizer] Warning: Gemini AI summarization notice:', err?.message);
  }
}

/**
 * On-demand single file summary generator using Gemini or heuristic.
 */
export async function generateSingleFileSummary(filePath: string, content?: string): Promise<string> {
  if (config.llmApiKey) {
    try {
      const snippet = content ? content.slice(0, 1500) : '';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.llmModel}:generateContent?key=${config.llmApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Provide a clear, 2-line plain-English architectural summary explaining what this file does in the repository: ${filePath}\n\nCode snippet:\n${snippet}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const data: any = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch {}
  }

  return generateHeuristicSummary({
    path: filePath,
    fileType: 'module',
    language: filePath.split('.').pop() || 'typescript',
  });
}
