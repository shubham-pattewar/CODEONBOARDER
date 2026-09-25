import fs from 'fs/promises';
import path from 'path';

/**
 * Robustly and asynchronously removes a temporary directory.
 * Retries up to 3 times to handle Windows file locking quirks.
 */
export async function safeDeleteDir(dirPath: string, retries = 3, delayMs = 200): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    // Directory does not exist, nothing to do
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return;
    } catch (err: any) {
      if (attempt === retries) {
        console.warn(`[cleanTemp] Warning: Failed to clean up temp directory ${dirPath} after ${retries} attempts:`, err?.message);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}
