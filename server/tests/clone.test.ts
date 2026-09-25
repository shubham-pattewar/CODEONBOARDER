import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicRepositoryInfo } from '../src/pipeline/clone';

describe('public repository preflight', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the immutable commit and GitHub-reported repository size', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ default_branch: 'main', size: 2048 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'abc123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getPublicRepositoryInfo('owner', 'repo')).resolves.toEqual({
      commitSha: 'abc123',
      defaultBranch: 'main',
      sizeBytes: 2048 * 1024,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects oversized repositories before cloning starts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ default_branch: 'main', size: 61 * 1024 }), { status: 200 }),
    ));

    await expect(getPublicRepositoryInfo('owner', 'too-large')).rejects.toThrow('exceeds the 60MB limit');
  });
});
