import fs from 'fs/promises';
import path from 'path';
import { IFileNode } from '../models/Analysis';
import { config } from '../config';

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  'vendor',
  '.vscode',
  '.idea',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.webm', '.ogg', '.mp3', '.wav',
  '.zip', '.tar', '.gz', '.tgz', '.7z', '.rar',
  '.pdf', '.exe', '.dll', '.so', '.dylib', '.lock',
]);

export interface ScannedFileInfo {
  node: IFileNode;
  content?: string;
}

export interface ScanResult {
  fileTree: any;
  files: ScannedFileInfo[];
  metadata: {
    primaryLanguage: string;
    totalFiles: number;
    frameworks: string[];
    isNonJsTs: boolean;
  };
  entryPoints: string[];
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.mts':
    case '.cts':
      return 'typescript';
    case '.tsx':
      return 'tsx';
    case '.js':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.jsx':
      return 'jsx';
    case '.json':
      return 'json';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.md':
    case '.mdx':
      return 'markdown';
    case '.py':
      return 'python';
    case '.go':
      return 'go';
    case '.rs':
      return 'rust';
    case '.java':
      return 'java';
    case '.rb':
      return 'ruby';
    case '.php':
      return 'php';
    case '.sh':
    case '.bash':
      return 'shell';
    case '.html':
      return 'html';
    case '.css':
    case '.scss':
    case '.less':
      return 'css';
    default:
      if (path.basename(filePath).toLowerCase() === 'dockerfile') return 'dockerfile';
      return 'plaintext';
  }
}

function detectInitialFileType(
  relPath: string, 
  lang: string, 
  packageMain?: string
): IFileNode['fileType'] {
  const normalized = relPath.replace(/\\/g, '/');
  const baseName = path.basename(normalized);

  // Check if entry point
  if (
    (packageMain && normalized === packageMain.replace(/^\.\//, '')) ||
    baseName === 'index.ts' ||
    baseName === 'index.js' ||
    baseName === 'server.ts' ||
    baseName === 'server.js' ||
    baseName === 'main.ts' ||
    baseName === 'main.js' ||
    baseName === 'app.ts' ||
    baseName === 'app.js' ||
    // Python entry points
    baseName === 'main.py' ||
    baseName === 'app.py' ||
    baseName === '__main__.py' ||
    baseName === 'manage.py' ||
    baseName === 'wsgi.py' ||
    baseName === 'asgi.py' ||
    // Go entry points
    baseName === 'main.go' ||
    // Rust entry points
    baseName === 'main.rs' ||
    baseName === 'lib.rs'
  ) {
    return 'entry';
  }

  // Check if test
  if (
    normalized.includes('.test.') ||
    normalized.includes('.spec.') ||
    normalized.includes('__tests__') ||
    normalized.includes('/tests/') ||
    normalized.includes('/test/')
  ) {
    return 'test';
  }

  // Check if config
  if (
    baseName.includes('.config.') ||
    baseName.startsWith('.') ||
    baseName.endsWith('.json') ||
    baseName.endsWith('.yml') ||
    baseName.endsWith('.yaml') ||
    baseName === 'Dockerfile' ||
    baseName === 'docker-compose.yml'
  ) {
    return 'config';
  }

  // Check if component
  if ((lang === 'tsx' || lang === 'jsx') && (normalized.includes('/components/') || normalized.includes('/views/') || normalized.includes('/ui/'))) {
    return 'component';
  }

  // Check if service
  if (normalized.includes('/services/') || normalized.includes('/controllers/') || normalized.includes('/api/')) {
    return 'service';
  }

  // Check if utility
  if (normalized.includes('/utils/') || normalized.includes('/helpers/') || normalized.includes('/lib/')) {
    return 'util';
  }

  return 'module';
}

export async function scanFileTree(cloneDir: string): Promise<ScanResult> {
  const files: ScannedFileInfo[] = [];
  const languageCounts: Record<string, number> = {};
  const frameworks: Set<string> = new Set();
  const entryPoints: Set<string> = new Set();

  let packageMain: string | undefined;

  // Check package.json for dependencies & entry point
  try {
    const pkgPath = path.join(cloneDir, 'package.json');
    const pkgContent = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);

    if (pkg.main) {
      packageMain = pkg.main;
      entryPoints.add(pkg.main.replace(/^\.\//, ''));
    }
    if (pkg.module) {
      entryPoints.add(pkg.module.replace(/^\.\//, ''));
    }

    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    if (allDeps['react']) frameworks.add('React');
    if (allDeps['next']) frameworks.add('Next.js');
    if (allDeps['vue']) frameworks.add('Vue');
    if (allDeps['svelte']) frameworks.add('Svelte');
    if (allDeps['express']) frameworks.add('Express');
    if (allDeps['fastify']) frameworks.add('Fastify');
    if (allDeps['@nestjs/core']) frameworks.add('NestJS');
    if (allDeps['tailwindcss']) frameworks.add('Tailwind CSS');
    if (allDeps['vite']) frameworks.add('Vite');
    if (allDeps['typescript']) frameworks.add('TypeScript');
    if (allDeps['mongoose']) frameworks.add('Mongoose');
    if (allDeps['prisma'] || allDeps['@prisma/client']) frameworks.add('Prisma');
  } catch {
    // No package.json or invalid JSON
  }

  // Check Python dependencies (requirements.txt / pyproject.toml / setup.py / Pipfile)
  const pyConfigFiles = ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'];
  for (const pyConf of pyConfigFiles) {
    try {
      const content = (await fs.readFile(path.join(cloneDir, pyConf), 'utf-8')).toLowerCase();
      if (content.includes('fastapi')) frameworks.add('FastAPI');
      if (content.includes('flask')) frameworks.add('Flask');
      if (content.includes('django')) frameworks.add('Django');
      if (content.includes('celery')) frameworks.add('Celery');
      if (content.includes('sqlalchemy')) frameworks.add('SQLAlchemy');
      if (content.includes('torch')) frameworks.add('PyTorch');
      if (content.includes('tensorflow')) frameworks.add('TensorFlow');
      if (content.includes('pydantic')) frameworks.add('Pydantic');
      if (content.includes('pandas')) frameworks.add('Pandas');
    } catch {}
  }

  // Check Go dependencies (go.mod)
  try {
    const goModContent = await fs.readFile(path.join(cloneDir, 'go.mod'), 'utf-8');
    if (goModContent.includes('github.com/gin-gonic/gin')) frameworks.add('Gin');
    if (goModContent.includes('github.com/labstack/echo')) frameworks.add('Echo');
    if (goModContent.includes('github.com/gofiber/fiber')) frameworks.add('Fiber');
    if (goModContent.includes('github.com/go-chi/chi')) frameworks.add('Chi');
    if (goModContent.includes('gorm.io/gorm')) frameworks.add('GORM');
  } catch {}

  // Check Rust dependencies (Cargo.toml)
  try {
    const cargoContent = await fs.readFile(path.join(cloneDir, 'Cargo.toml'), 'utf-8');
    if (cargoContent.includes('actix-web')) frameworks.add('Actix Web');
    if (cargoContent.includes('axum')) frameworks.add('Axum');
    if (cargoContent.includes('rocket')) frameworks.add('Rocket');
    if (cargoContent.includes('tokio')) frameworks.add('Tokio');
    if (cargoContent.includes('diesel')) frameworks.add('Diesel');
    if (cargoContent.includes('sqlx')) frameworks.add('SQLx');
    if (cargoContent.includes('serde')) frameworks.add('Serde');
  } catch {}

  // Check Dockerfile / docker-compose
  try {
    await fs.access(path.join(cloneDir, 'Dockerfile'));
    frameworks.add('Docker');
  } catch {}
  try {
    await fs.access(path.join(cloneDir, 'docker-compose.yml'));
    frameworks.add('Docker Compose');
  } catch {}

  const fileTree: any = { name: 'root', path: '', isDirectory: true, children: [] };

  async function traverse(currentDir: string, currentRelative: string, parentNode: any) {
    if (files.length >= config.maxParsedFiles) {
      return;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= config.maxParsedFiles) break;

      const name = entry.name;
      const relPath = currentRelative ? `${currentRelative}/${name}` : name;
      const fullPath = path.join(currentDir, name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(name) || name.startsWith('.')) {
          continue;
        }

        const dirNode = {
          name,
          path: relPath,
          isDirectory: true,
          children: [],
        };
        parentNode.children.push(dirNode);
        await traverse(fullPath, relPath, dirNode);
      } else if (entry.isFile()) {
        const ext = path.extname(name).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) {
          continue;
        }

        const stats = await fs.stat(fullPath);
        const language = detectLanguage(relPath);
        languageCounts[language] = (languageCounts[language] || 0) + 1;

        const fileType = detectInitialFileType(relPath, language, packageMain);
        if (fileType === 'entry') {
          entryPoints.add(relPath);
        }

        let content: string | undefined;
        // Read content for JS/TS, Python, Go, Rust, JSON, YAML, Dockerfile
        if (
          language === 'typescript' || 
          language === 'tsx' || 
          language === 'javascript' || 
          language === 'jsx' || 
          language === 'python' ||
          language === 'go' ||
          language === 'rust' ||
          language === 'json' ||
          language === 'yaml' ||
          name.toLowerCase() === 'dockerfile'
        ) {
          try {
            content = await fs.readFile(fullPath, 'utf-8');
          } catch {
            content = '';
          }
        }

        const fileNode: IFileNode = {
          id: relPath,
          label: name,
          path: relPath,
          language,
          fileType,
          sizeBytes: stats.size,
          folder: currentRelative || '.',
          imports: [],
          importedBy: [],
          inDegree: 0,
          outDegree: 0,
          rank: 0,
          isCycleMember: false,
        };

        files.push({ node: fileNode, content });

        parentNode.children.push({
          name,
          path: relPath,
          isDirectory: false,
          size: stats.size,
          language,
          fileType,
        });
      }
    }
  }

  await traverse(cloneDir, '', fileTree);

  // Determine primary language & code coverage
  let maxCount = 0;
  let primaryLanguage = 'Unknown';
  let supportedCodeCount = 0;

  for (const [lang, count] of Object.entries(languageCounts)) {
    if (count > maxCount && lang !== 'plaintext' && lang !== 'json' && lang !== 'yaml' && lang !== 'markdown') {
      maxCount = count;
      primaryLanguage = lang.charAt(0).toUpperCase() + lang.slice(1);
    }
    if (
      lang === 'typescript' ||
      lang === 'tsx' ||
      lang === 'javascript' ||
      lang === 'jsx' ||
      lang === 'python' ||
      lang === 'go' ||
      lang === 'rust'
    ) {
      supportedCodeCount += count;
    }
  }

  const isNonJsTs = files.length > 0 && supportedCodeCount / files.length < 0.10;

  return {
    fileTree,
    files,
    metadata: {
      primaryLanguage,
      totalFiles: files.length,
      frameworks: Array.from(frameworks),
      isNonJsTs,
    },
    entryPoints: Array.from(entryPoints),
  };
}
