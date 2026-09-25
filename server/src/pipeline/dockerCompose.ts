import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { IServiceDefinition } from '../models/Analysis';

export async function parseServices(cloneDir: string): Promise<IServiceDefinition[]> {
  const services: IServiceDefinition[] = [];

  // 1. Look for Docker Compose files
  const composeFiles = [
    'docker-compose.yml',
    'docker-compose.yaml',
    'compose.yml',
    'compose.yaml',
  ];

  let composeParsed = false;

  for (const filename of composeFiles) {
    const fullPath = path.join(cloneDir, filename);
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const doc = yaml.load(content) as any;

      if (doc && typeof doc === 'object' && doc.services) {
        composeParsed = true;
        for (const [name, srv] of Object.entries<any>(doc.services)) {
          const ports: string[] = [];
          if (Array.isArray(srv.ports)) {
            for (const p of srv.ports) {
              ports.push(typeof p === 'object' ? `${p.published}:${p.target}` : String(p));
            }
          }

          let dependsOn: string[] = [];
          if (Array.isArray(srv.depends_on)) {
            dependsOn = srv.depends_on;
          } else if (srv.depends_on && typeof srv.depends_on === 'object') {
            dependsOn = Object.keys(srv.depends_on);
          }

          const envKeys: string[] = [];
          if (Array.isArray(srv.environment)) {
            for (const envItem of srv.environment) {
              const key = String(envItem).split('=')[0];
              if (key) envKeys.push(key);
            }
          } else if (srv.environment && typeof srv.environment === 'object') {
            envKeys.push(...Object.keys(srv.environment));
          }

          services.push({
            name,
            type: 'docker-service',
            image: srv.image || (srv.build ? 'custom-build' : undefined),
            path: typeof srv.build === 'string' ? srv.build : srv.build?.context,
            ports,
            dependsOn,
            envKeys,
          });
        }
        break; // Successfully parsed docker compose
      }
    } catch {
      // Continue to next file
    }
  }

  // 2. Check for root Dockerfile if no compose services found
  if (!composeParsed) {
    try {
      await fs.access(path.join(cloneDir, 'Dockerfile'));
      services.push({
        name: 'app-container',
        type: 'docker-service',
        image: 'Dockerfile',
        path: './Dockerfile',
        ports: [],
        dependsOn: [],
      });
    } catch {}
  }

  // 3. Check for Monorepo Workspaces in package.json
  try {
    const pkgPath = path.join(cloneDir, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);

    let workspaces: string[] = [];
    if (Array.isArray(pkg.workspaces)) {
      workspaces = pkg.workspaces;
    } else if (pkg.workspaces?.packages) {
      workspaces = pkg.workspaces.packages;
    }

    for (const ws of workspaces) {
      services.push({
        name: ws.replace(/\/\*$/, ''),
        type: 'workspace-package',
        path: ws,
        dependsOn: [],
      });
    }
  } catch {}

  return services;
}
