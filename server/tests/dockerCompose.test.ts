import { describe, it, expect } from 'vitest';
import { parseServices } from '../src/pipeline/dockerCompose';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Docker Compose & Services Parser', () => {
  it('parses services, ports, images, and dependencies from docker-compose.yml', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'compose-test-'));
    const composeContent = `
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://...
  db:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: secret
  redis:
    image: redis:alpine
`;

    await fs.writeFile(path.join(tmpDir, 'docker-compose.yml'), composeContent);

    try {
      const services = await parseServices(tmpDir);
      expect(services.length).toBe(3);

      const webService = services.find(s => s.name === 'web');
      expect(webService).toBeDefined();
      expect(webService?.dependsOn).toContain('db');
      expect(webService?.dependsOn).toContain('redis');
      expect(webService?.ports).toContain('3000:3000');
      expect(webService?.envKeys).toContain('NODE_ENV');

      const dbService = services.find(s => s.name === 'db');
      expect(dbService?.image).toBe('postgres:15');
      expect(dbService?.ports).toContain('5432:5432');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('detects standalone Dockerfile when no compose file exists', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docker-test-'));
    await fs.writeFile(path.join(tmpDir, 'Dockerfile'), 'FROM node:20\nWORKDIR /app\n');

    try {
      const services = await parseServices(tmpDir);
      expect(services.length).toBe(1);
      expect(services[0].name).toBe('app-container');
      expect(services[0].image).toBe('Dockerfile');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
