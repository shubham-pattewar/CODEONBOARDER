import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { config } from '../config';
import { safeDeleteDir } from '../utils/cleanTemp';

export interface CloneResult {
  cloneDir: string;
  commitSha: string;
  branch: string;
  sizeBytes: number;
}

export interface RepositoryInfo {
  commitSha: string;
  defaultBranch: string;
  sizeBytes: number;
}

export type PublicRepositoryInfo = RepositoryInfo;

/**
 * Checks GitHub repository metadata before a clone begins.
 * Supports private repositories when a GitHub Personal Access Token (PAT) is supplied.
 */
export async function getRepositoryInfo(
  owner: string,
  repo: string,
  token?: string
): Promise<RepositoryInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(config.cloneTimeoutMs, 10_000));

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'codebase-onboarder',
  };

  const cleanToken = token?.trim();
  if (cleanToken) {
    headers['Authorization'] = `token ${cleanToken}`;
  }

  try {
    const repositoryResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: controller.signal,
    });

    if (repositoryResponse.status === 404) {
      if (!cleanToken) {
        throw new Error(
          'Repository was not found or is private. Provide a GitHub Personal Access Token (PAT) to analyze private repositories.'
        );
      }
      throw new Error('Repository was not found. Please verify the owner, repository name, and PAT permissions.');
    }
    if (repositoryResponse.status === 401 || repositoryResponse.status === 403) {
      throw new Error(
        'GitHub authentication error or rate limit exceeded. Check your GitHub Personal Access Token (PAT) permissions.'
      );
    }
    if (!repositoryResponse.ok) {
      throw new Error(`GitHub could not validate this repository (HTTP ${repositoryResponse.status}). Please try again shortly.`);
    }

    const repository = (await repositoryResponse.json()) as { default_branch?: string; size?: number };
    const sizeBytes = Math.max(0, Number(repository.size || 0)) * 1024;
    const maxSizeBytes = config.maxRepoSizeMb * 1024 * 1024;
    if (sizeBytes > maxSizeBytes) {
      throw new Error(`Repository size (${(sizeBytes / (1024 * 1024)).toFixed(1)}MB) exceeds the ${config.maxRepoSizeMb}MB limit.`);
    }

    const defaultBranch = repository.default_branch || 'HEAD';
    const commitResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(defaultBranch)}`,
      {
        headers,
        signal: controller.signal,
      },
    );
    if (!commitResponse.ok) {
      throw new Error(`GitHub could not resolve the repository's latest commit (HTTP ${commitResponse.status}).`);
    }

    const commit = (await commitResponse.json()) as { sha?: string };
    if (!commit.sha) {
      throw new Error('GitHub returned no commit SHA for this repository.');
    }

    return { commitSha: commit.sha, defaultBranch, sizeBytes };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('GitHub metadata lookup timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Backward compatibility alias
export const getPublicRepositoryInfo = getRepositoryInfo;

/**
 * Calculates total size of a directory recursively
 */
async function calculateDirSize(dirPath: string): Promise<number> {
  let totalSize = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += await calculateDirSize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch (err) {
    // Ignore inaccessible files
  }
  return totalSize;
}

/**
 * Clones a GitHub repository shallowly (--depth 1) into a temporary folder.
 * Supports private repositories when a GitHub Personal Access Token (PAT) is supplied.
 */
export async function shallowClone(repoUrl: string, token?: string): Promise<CloneResult> {
  const uniqueId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const targetDir = path.join(config.tempDir, uniqueId);

  try {
    await fs.mkdir(config.tempDir, { recursive: true });

    const git: SimpleGit = simpleGit({
      timeout: {
        block: config.cloneTimeoutMs,
      },
      maxConcurrentProcesses: 2,
    });

    let cloneUrl = repoUrl;
    const cleanToken = token?.trim();
    if (cleanToken) {
      const match = repoUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
      if (match) {
        const owner = match[1];
        const repo = match[2].replace(/\.git$/, '');
        cloneUrl = `https://x-access-token:${encodeURIComponent(cleanToken)}@github.com/${owner}/${repo}.git`;
      }
    }

    // Execute shallow clone
    await git.clone(cloneUrl, targetDir, [
      '--depth', '1',
      '--single-branch',
      '--no-tags',
    ]);

    const targetGit: SimpleGit = simpleGit(targetDir);

    // Extract commit SHA
    const revParse = await targetGit.revparse(['HEAD']);
    const commitSha = revParse.trim();

    // Extract branch name
    let branch = 'main';
    try {
      const branchSummary = await targetGit.branch();
      branch = branchSummary.current || 'main';
    } catch {
      // Default to main if detached HEAD
    }

    const totalSizeBytes = await calculateDirSize(targetDir);
    const sizeMb = totalSizeBytes / (1024 * 1024);
    if (sizeMb > config.maxRepoSizeMb) {
      throw new Error(`Repository size (${sizeMb.toFixed(1)}MB) exceeds maximum allowed limit of ${config.maxRepoSizeMb}MB.`);
    }

    return {
      cloneDir: targetDir,
      commitSha,
      branch,
      sizeBytes: totalSizeBytes,
    };
  } catch (error) {
    await safeDeleteDir(targetDir);
    throw error;
  }
}
