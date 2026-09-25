import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/codebase-onboarder',
  maxRepoSizeMb: parseInt(process.env.MAX_REPO_SIZE_MB || '60', 10),
  maxParsedFiles: parseInt(process.env.MAX_PARSED_FILES || '1000', 10),
  cloneTimeoutMs: parseInt(process.env.CLONE_TIMEOUT_MS || '30000', 10),
  llmApiKey: process.env.LLM_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gemini-2.5-flash',
  tempDir: path.resolve(process.cwd(), '.temp_repos'),
};
