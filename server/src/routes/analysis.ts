import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Analysis } from '../models/Analysis';
import { generateMermaidDiagram } from '../utils/mermaidGen';
import { generateSingleFileSummary } from '../pipeline/aiSummarizer';

export const analysisRouter = Router();

/**
 * GET /api/analysis
 * Returns a list of past analyses for History UI
 */
analysisRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const historyList: any[] = [];
    const seenIds = new Set<string>();

    // 1. From MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      const docs = await Analysis.find(
        {},
        '_id repoUrl owner repo commitSha branch createdAt metadata nodes edges services'
      )
        .sort({ createdAt: -1 })
        .limit(40)
        .lean();

      for (const d of docs) {
        const id = String(d._id);
        seenIds.add(id);
        historyList.push({
          id,
          repoUrl: d.repoUrl,
          owner: d.owner,
          repo: d.repo,
          commitSha: d.commitSha,
          branch: d.branch,
          createdAt: d.createdAt,
          primaryLanguage: d.metadata?.primaryLanguage || 'Unknown',
          totalFiles: d.metadata?.totalFiles || (d.nodes ? d.nodes.length : 0),
          nodesCount: d.nodes ? d.nodes.length : 0,
          edgesCount: d.edges ? d.edges.length : 0,
          servicesCount: d.services ? d.services.length : 0,
          frameworks: d.metadata?.frameworks || [],
        });
      }
    }

    // 2. From in-memory cache
    if ((global as any).__analysisCache) {
      for (const [id, d] of (global as any).__analysisCache.entries()) {
        if (!seenIds.has(String(id))) {
          historyList.push({
            id: String(id),
            repoUrl: d.repoUrl,
            owner: d.owner,
            repo: d.repo,
            commitSha: d.commitSha,
            branch: d.branch,
            createdAt: d.createdAt || new Date(),
            primaryLanguage: d.metadata?.primaryLanguage || 'Unknown',
            totalFiles: d.metadata?.totalFiles || (d.nodes ? d.nodes.length : 0),
            nodesCount: d.nodes ? d.nodes.length : 0,
            edgesCount: d.edges ? d.edges.length : 0,
            servicesCount: d.services ? d.services.length : 0,
            frameworks: d.metadata?.frameworks || [],
          });
        }
      }
    }

    // Sort descending by creation date
    historyList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(historyList);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching analysis history' });
  }
});

/**
 * GET /api/analysis/:id
 * Fetches the full analysis payload
 */
analysisRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    let doc: any = null;

    // Check MongoDB if connected and valid ObjectId
    if (mongoose.connection.readyState === 1 && id.match(/^[0-9a-fA-F]{24}$/)) {
      doc = await Analysis.findById(id).lean();
    }

    // Check fallback in-memory cache
    if (!doc && (global as any).__analysisCache) {
      doc = (global as any).__analysisCache.get(id);
    }

    if (!doc) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }

    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching analysis' });
  }
});

/**
 * POST /api/analysis/:id/file-summary
 * Generates an on-demand AI summary for a specific file
 */
analysisRouter.post('/:id/file-summary', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { filePath } = req.body;

  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'filePath is required' });
    return;
  }

  try {
    let doc: any = null;
    let isMongo = false;

    if (mongoose.connection.readyState === 1 && id.match(/^[0-9a-fA-F]{24}$/)) {
      doc = await Analysis.findById(id);
      if (doc) isMongo = true;
    }
    if (!doc && (global as any).__analysisCache) {
      doc = (global as any).__analysisCache.get(id);
    }

    if (!doc) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }

    const summary = await generateSingleFileSummary(filePath);

    // Update in MongoDB if available
    if (isMongo) {
      await Analysis.updateOne(
        { _id: id, 'nodes.id': filePath },
        { $set: { 'nodes.$.summary': summary } }
      );
    } else if (doc.nodes) {
      const target = doc.nodes.find((n: any) => n.id === filePath);
      if (target) target.summary = summary;
    }

    res.json({ filePath, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate file summary' });
  }
});

/**
 * GET /api/analysis/:id/export?format=mermaid
 * Exports Mermaid text
 */
analysisRouter.get('/:id/export', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { format } = req.query;

  try {
    let doc: any = null;
    if (mongoose.connection.readyState === 1 && id.match(/^[0-9a-fA-F]{24}$/)) {
      doc = await Analysis.findById(id).lean();
    }
    if (!doc && (global as any).__analysisCache) {
      doc = (global as any).__analysisCache.get(id);
    }

    if (!doc) {
      res.status(404).json({ error: 'Analysis not found' });
      return;
    }

    if (format === 'mermaid') {
      const mermaidText = generateMermaidDiagram(doc);
      res.setHeader('Content-Type', 'text/plain');
      res.send(mermaidText);
      return;
    }

    res.status(400).json({ error: 'Unsupported export format. Supported formats: mermaid' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error exporting analysis' });
  }
});
