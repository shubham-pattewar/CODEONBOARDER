import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import { jobManager } from '../models/Job';
import { Analysis } from '../models/Analysis';
import { getPublicRepositoryInfo, shallowClone } from '../pipeline/clone';
import { scanFileTree } from '../pipeline/fileTree';
import { parseImports, resolveImportPath, loadTsConfigAliases } from '../pipeline/parser';
import { buildGraph } from '../pipeline/graph';
import { parseServices } from '../pipeline/dockerCompose';
import { enrichWithAiSummaries } from '../pipeline/aiSummarizer';
import { safeDeleteDir } from '../utils/cleanTemp';

export const analyzeRouter = Router();

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\.git)?\/?$/;

/**
 * POST /api/analyze
 * Initiates repository analysis job or returns cached analysis.
 * Supports private repos via githubToken and forced refresh via forceRefresh.
 */
analyzeRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { repoUrl, githubToken, forceRefresh } = req.body;

  // Also support Authorization header
  const authHeader = req.headers.authorization;
  const token = (githubToken as string) || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

  if (!repoUrl || typeof repoUrl !== 'string') {
    res.status(400).json({ error: 'Repository URL is required.' });
    return;
  }

  const match = repoUrl.trim().match(GITHUB_URL_REGEX);
  if (!match) {
    res.status(400).json({ 
      error: 'Invalid GitHub URL. Must be in format https://github.com/owner/repo' 
    });
    return;
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, '');
  const normalizedUrl = `https://github.com/${owner}/${repo}`;

  // Attempt to resolve head commit from GitHub API for instantaneous cache hit if available
  try {
    const repoInfo = await getPublicRepositoryInfo(owner, repo, token);

    if (!forceRefresh && repoInfo?.commitSha) {
      if (mongoose.connection.readyState === 1) {
        const cached = await Analysis.findOne({ repoUrl: normalizedUrl, commitSha: repoInfo.commitSha }).lean();
        if (cached) {
          res.json({ jobId: 'cached', cached: true, analysisId: (cached as any)._id });
          return;
        }
      }

      if ((global as any).__analysisCache) {
        for (const [id, cached] of (global as any).__analysisCache.entries()) {
          if (cached.repoUrl === normalizedUrl && cached.commitSha === repoInfo.commitSha) {
            res.json({ jobId: 'cached', cached: true, analysisId: id });
            return;
          }
        }
      }
    }
  } catch (error: any) {
    // If GitHub REST API is rate limited (very common on shared cloud host IPs like Render/AWS) or private,
    // do NOT block the user. Proceed directly to git clone, which uses the Git protocol without REST API limits.
    console.warn(`[Pre-check Notice] Could not fetch GitHub API metadata for ${owner}/${repo}: ${error?.message}. Proceeding directly to clone.`);
  }

  const jobId = crypto.randomUUID();
  jobManager.createJob(jobId, normalizedUrl);

  res.status(202).json({
    jobId,
    cached: false,
    message: forceRefresh ? 'Re-analyzing repository (force refresh)...' : 'Analysis job started',
  });

  // Run async pipeline in background
  runPipeline(jobId, normalizedUrl, owner, repo, token, forceRefresh).catch(err => {
    console.error(`[Pipeline Error] Job ${jobId}:`, err);
  });
});

/**
 * GET /api/jobs/:id
 * Polling endpoint for job status
 */
analyzeRouter.get('/jobs/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const job = jobManager.getJob(id);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    error: job.error,
    analysisId: job.analysisId,
  });
});

/**
 * GET /api/jobs/:id/events
 * Server-Sent Events stream for live progress updates
 */
analyzeRouter.get('/jobs/:id/events', (req: Request, res: Response): void => {
  const { id } = req.params;
  const job = jobManager.getJob(id);

  if (!job) {
    res.status(404).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send current state
  res.write(`data: ${JSON.stringify(job)}\n\n`);

  const onUpdate = (updatedJob: any) => {
    res.write(`data: ${JSON.stringify(updatedJob)}\n\n`);
    if (updatedJob.status === 'done' || updatedJob.status === 'error') {
      res.end();
    }
  };

  jobManager.on(`update:${id}`, onUpdate);

  req.on('close', () => {
    jobManager.off(`update:${id}`, onUpdate);
  });
});

/**
 * Executes the complete analysis pipeline
 */
async function runPipeline(
  jobId: string,
  repoUrl: string,
  owner: string,
  repo: string,
  token?: string,
  forceRefresh?: boolean
): Promise<void> {
  let cloneDir: string | null = null;

  try {
    // 1. Clone
    jobManager.updateJob(jobId, {
      status: 'cloning',
      progress: 20,
      message: `Cloning ${owner}/${repo} shallow (depth=1)...`,
    });

    const cloneResult = await shallowClone(repoUrl, token);
    cloneDir = cloneResult.cloneDir;

    // Check cache by commit SHA unless forceRefresh is true
    if (!forceRefresh) {
      if (mongoose.connection.readyState === 1) {
        try {
          const existing = await Analysis.findOne({
            repoUrl,
            commitSha: cloneResult.commitSha,
          }).lean();

          if (existing) {
            jobManager.updateJob(jobId, {
              status: 'done',
              progress: 100,
              message: 'Retrieved from cache',
              analysisId: (existing as any)._id,
            });
            return;
          }
        } catch {}
      } else if ((global as any).__analysisCache) {
        for (const [id, cached] of (global as any).__analysisCache.entries()) {
          if (cached.repoUrl === repoUrl && cached.commitSha === cloneResult.commitSha) {
            jobManager.updateJob(jobId, {
              status: 'done',
              progress: 100,
              message: 'Retrieved from in-memory cache',
              analysisId: id,
            });
            return;
          }
        }
      }
    }

    // 2. Scan file tree & languages
    jobManager.updateJob(jobId, {
      status: 'scanning',
      progress: 50,
      message: 'Scanning file tree and detecting multi-language frameworks...',
    });

    const scanResult = await scanFileTree(cloneDir);

    // 3. Build graph & parse imports
    jobManager.updateJob(jobId, {
      status: 'building_graph',
      progress: 75,
      message: 'Parsing multi-language AST imports (TS/JS, Python, Go, Rust)...',
    });

    const allFilePathsSet = new Set(scanResult.files.map(f => f.node.path));
    const tsAliases = await loadTsConfigAliases(cloneDir);

    const rawEdges: { source: string; target: string }[] = [];

    // Parse imports for all files with content (TS/JS, Python, Go, Rust)
    for (const file of scanResult.files) {
      if (file.content) {
        const specifiers = parseImports(file.content, file.node.path);
        for (const spec of specifiers) {
          const resolved = resolveImportPath(spec, file.node.path, allFilePathsSet, tsAliases);
          if (resolved && resolved !== file.node.path) {
            rawEdges.push({ source: file.node.path, target: resolved });
          }
        }
      }
    }

    const rawNodes = scanResult.files.map(f => f.node);
    const graphResult = buildGraph(rawNodes, rawEdges, scanResult.entryPoints);
    const services = await parseServices(cloneDir);

    // 4. Optional AI summaries
    await enrichWithAiSummaries(graphResult.nodes, graphResult.readingOrder);

    // 5. Store in MongoDB or in-memory cache
    let savedDoc: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        savedDoc = await Analysis.create({
          repoUrl,
          owner,
          repo,
          commitSha: cloneResult.commitSha,
          branch: cloneResult.branch,
          createdAt: new Date(),
          metadata: scanResult.metadata,
          fileTree: scanResult.fileTree,
          nodes: graphResult.nodes,
          edges: graphResult.edges,
          modules: graphResult.modules,
          services,
          entryPoints: scanResult.entryPoints,
          cycles: graphResult.cycles,
          readingOrder: graphResult.readingOrder,
        });
      } catch (dbErr: any) {
        console.warn('[DB] Notice: Could not save to MongoDB, continuing with in-memory result:', dbErr?.message);
      }
    }

    const analysisId = savedDoc ? String(savedDoc._id) : `mem_${Date.now()}`;

    // If MongoDB is not connected, store in memory cache so analysis endpoint can return it
    if (!savedDoc) {
      (global as any).__analysisCache = (global as any).__analysisCache || new Map();
      (global as any).__analysisCache.set(analysisId, {
        _id: analysisId,
        repoUrl,
        owner,
        repo,
        commitSha: cloneResult.commitSha,
        branch: cloneResult.branch,
        createdAt: new Date(),
        metadata: scanResult.metadata,
        fileTree: scanResult.fileTree,
        nodes: graphResult.nodes,
        edges: graphResult.edges,
        modules: graphResult.modules,
        services,
        entryPoints: scanResult.entryPoints,
        cycles: graphResult.cycles,
        readingOrder: graphResult.readingOrder,
      });
    }

    // Done!
    jobManager.updateJob(jobId, {
      status: 'done',
      progress: 100,
      message: 'Analysis complete!',
      analysisId,
    });
  } catch (err: any) {
    jobManager.updateJob(jobId, {
      status: 'error',
      progress: 0,
      message: 'Analysis failed',
      error: err?.message || 'Failed to analyze repository.',
    });
  } finally {
    // ALWAYS clean up temporary clone directory
    if (cloneDir) {
      await safeDeleteDir(cloneDir);
    }
  }
}
