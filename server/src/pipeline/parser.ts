import { parse } from '@babel/parser';
import traverseDefault from '@babel/traverse';
import path from 'path';
import fs from 'fs/promises';

// Handle babel traverse ESM/CJS interop
const traverse = (traverseDefault as any).default || traverseDefault;

export interface ImportMatch {
  specifier: string;
  sourceFile: string;
}

/**
 * Parses tsconfig.json to extract path aliases (e.g., "@/*": ["src/*"])
 */
export async function loadTsConfigAliases(cloneDir: string): Promise<Record<string, string[]>> {
  const tsConfigPaths = [
    path.join(cloneDir, 'tsconfig.json'),
    path.join(cloneDir, 'tsconfig.base.json'),
    path.join(cloneDir, 'jsconfig.json'),
  ];

  for (const configPath of tsConfigPaths) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      // Strip comments from json
      const cleaned = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      const json = JSON.parse(cleaned);
      if (json.compilerOptions?.paths) {
        return json.compilerOptions.paths;
      }
    } catch {
      // Continue to next
    }
  }

  return {};
}

/**
 * Resolves an import specifier to a relative file path within the repo across languages:
 * TypeScript / JavaScript, Python, Go, and Rust.
 */
export function resolveImportPath(
  specifier: string,
  sourceFilePath: string,
  allFilesSet: Set<string>,
  aliases: Record<string, string[]> = {}
): string | null {
  const ext = path.extname(sourceFilePath).toLowerCase();
  const sourceDir = path.dirname(sourceFilePath).replace(/\\/g, '/');

  // Python resolution
  if (ext === '.py' || ext === '.pyw') {
    let candidateBase = '';
    if (specifier.startsWith('.')) {
      // Relative import: count leading dots
      let dotCount = 0;
      while (specifier[dotCount] === '.') dotCount++;
      const rest = specifier.slice(dotCount).replace(/\./g, '/');
      
      let dir = sourceDir;
      for (let i = 1; i < dotCount; i++) {
        dir = path.dirname(dir).replace(/\\/g, '/');
      }
      candidateBase = rest ? path.join(dir, rest).replace(/\\/g, '/') : dir;
    } else {
      // Absolute import within project: e.g. "services.auth" -> "services/auth"
      candidateBase = specifier.replace(/\./g, '/');
    }

    const pyCandidates = [
      candidateBase + '.py',
      candidateBase + '/__init__.py',
      path.join(sourceDir, candidateBase + '.py').replace(/\\/g, '/'),
      path.join(sourceDir, candidateBase + '/__init__.py').replace(/\\/g, '/'),
      path.join('src', candidateBase + '.py').replace(/\\/g, '/'),
      path.join('src', candidateBase + '/__init__.py').replace(/\\/g, '/'),
    ];

    for (const c of pyCandidates) {
      if (allFilesSet.has(c)) return c;
    }
    return null;
  }

  // Go resolution
  if (ext === '.go') {
    // Specifier e.g. "github.com/owner/repo/internal/db" or "internal/db"
    const cleaned = specifier.replace(/^["']|["']$/g, '');
    const segments = cleaned.split('/');
    
    // Try matching suffix folders in the repository
    for (let i = 0; i < segments.length; i++) {
      const subpath = segments.slice(i).join('/');
      // Find a .go file in that folder
      for (const filePath of allFilesSet) {
        if (filePath.endsWith('.go') && (path.dirname(filePath).replace(/\\/g, '/') === subpath || filePath.startsWith(subpath + '/'))) {
          return filePath;
        }
      }
    }
    return null;
  }

  // Rust resolution
  if (ext === '.rs') {
    // 1. Module declaration: "mod foo;"
    if (specifier.startsWith('mod:')) {
      const modName = specifier.replace(/^mod:/, '');
      const candidates = [
        path.join(sourceDir, `${modName}.rs`).replace(/\\/g, '/'),
        path.join(sourceDir, modName, 'mod.rs').replace(/\\/g, '/'),
        path.join('src', `${modName}.rs`).replace(/\\/g, '/'),
        path.join('src', modName, 'mod.rs').replace(/\\/g, '/'),
      ];
      for (const c of candidates) {
        if (allFilesSet.has(c)) return c;
      }
      return null;
    }

    // 2. Use statements: crate::foo, super::foo, or foo::bar
    let modPath = specifier.replace(/^use:/, '').replace(/::/g, '/');
    if (modPath.startsWith('crate/')) {
      const sub = modPath.replace(/^crate\//, '');
      const candidates = [
        path.join('src', `${sub}.rs`).replace(/\\/g, '/'),
        path.join('src', sub, 'mod.rs').replace(/\\/g, '/'),
        `${sub}.rs`,
        `${sub}/mod.rs`,
      ];
      for (const c of candidates) {
        if (allFilesSet.has(c)) return c;
      }
    } else if (modPath.startsWith('super/')) {
      const parentDir = path.dirname(sourceDir).replace(/\\/g, '/');
      const sub = modPath.replace(/^super\//, '');
      const candidates = [
        path.join(parentDir, `${sub}.rs`).replace(/\\/g, '/'),
        path.join(parentDir, sub, 'mod.rs').replace(/\\/g, '/'),
      ];
      for (const c of candidates) {
        if (allFilesSet.has(c)) return c;
      }
    }
    return null;
  }

  // JS/TS resolution
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  const isAlias = Object.keys(aliases).some(alias => {
    const prefix = alias.replace('/*', '');
    return specifier.startsWith(prefix);
  });

  if (!isRelative && !isAlias) {
    return null; // External package
  }

  let candidateBase: string;

  if (isAlias) {
    let resolvedSpecifier = specifier;
    for (const [aliasPattern, targetPatterns] of Object.entries(aliases)) {
      const prefix = aliasPattern.replace('/*', '');
      if (specifier.startsWith(prefix)) {
        const sub = specifier.substring(prefix.length).replace(/^\//, '');
        const target = targetPatterns[0]?.replace('/*', '') || '';
        resolvedSpecifier = path.join(target, sub).replace(/\\/g, '/');
        break;
      }
    }
    candidateBase = resolvedSpecifier.replace(/^\//, '');
  } else {
    candidateBase = path.normalize(path.join(sourceDir, specifier)).replace(/\\/g, '/');
  }

  // Extensions to check in priority order
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];

  for (const itemExt of extensions) {
    const full = candidateBase + itemExt;
    if (allFilesSet.has(full)) {
      return full;
    }
  }

  return null;
}

/**
 * Extracts import and dependency specifiers across multiple languages:
 * - TypeScript / JavaScript (Babel AST + regex fallback)
 * - Python (import foo, from foo.bar import baz, from . import foo)
 * - Go (import "...", import ( ... ))
 * - Rust (mod foo;, use crate::foo::bar;)
 */
export function parseImports(content: string, filePath: string): string[] {
  const ext = path.extname(filePath).toLowerCase();

  // 1. Python Parser
  if (ext === '.py' || ext === '.pyw') {
    const pyImports: Set<string> = new Set();
    // from foo.bar import baz, ...
    const fromRegex = /^\s*from\s+([.\w]+)\s+import/gm;
    let match;
    while ((match = fromRegex.exec(content)) !== null) {
      if (match[1]) pyImports.add(match[1]);
    }
    // import foo, bar.baz
    const importRegex = /^\s*import\s+([a-zA-Z0-9_., \t]+)/gm;
    while ((match = importRegex.exec(content)) !== null) {
      const parts = match[1].split(',');
      for (const p of parts) {
        const cleaned = p.trim().split(/\s+as\s+/)[0].trim();
        if (cleaned) pyImports.add(cleaned);
      }
    }
    return Array.from(pyImports);
  }

  // 2. Go Parser
  if (ext === '.go') {
    const goImports: Set<string> = new Set();
    // Single import: import "path/to/pkg"
    const singleRegex = /^\s*import\s+(?:[a-zA-Z0-9_]+\s+)?["']([^"']+)["']/gm;
    let match;
    while ((match = singleRegex.exec(content)) !== null) {
      if (match[1]) goImports.add(match[1]);
    }
    // Multi import: import ( ... )
    const blockRegex = /import\s*\(([\s\S]*?)\)/g;
    while ((match = blockRegex.exec(content)) !== null) {
      const block = match[1];
      const lineRegex = /["']([^"']+)["']/g;
      let lineMatch;
      while ((lineMatch = lineRegex.exec(block)) !== null) {
        if (lineMatch[1]) goImports.add(lineMatch[1]);
      }
    }
    return Array.from(goImports);
  }

  // 3. Rust Parser
  if (ext === '.rs') {
    const rsImports: Set<string> = new Set();
    // mod foo;
    const modRegex = /^\s*(?:pub\s+)?mod\s+([a-zA-Z0-9_]+)\s*;/gm;
    let match;
    while ((match = modRegex.exec(content)) !== null) {
      if (match[1]) rsImports.add(`mod:${match[1]}`);
    }
    // use crate::foo::bar; or use super::foo;
    const useRegex = /^\s*(?:pub\s+)?use\s+((?:crate|super|self)::[a-zA-Z0-9_:]+)/gm;
    while ((match = useRegex.exec(content)) !== null) {
      if (match[1]) rsImports.add(`use:${match[1]}`);
    }
    return Array.from(rsImports);
  }

  // 4. JavaScript / TypeScript Parser (Babel AST)
  const imports: Set<string> = new Set();

  try {
    const isTs = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    const isJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');

    const ast = parse(content, {
      sourceType: 'module',
      plugins: [
        ...(isTs ? (['typescript'] as any) : []),
        ...(isJsx ? (['jsx'] as any) : []),
        'classProperties',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'objectRestSpread',
        'asyncGenerators',
        'topLevelAwait',
      ],
      errorRecovery: true,
    });

    traverse(ast, {
      ImportDeclaration({ node }: any) {
        if (node.source?.value) {
          imports.add(node.source.value);
        }
      },
      ExportNamedDeclaration({ node }: any) {
        if (node.source?.value) {
          imports.add(node.source.value);
        }
      },
      ExportAllDeclaration({ node }: any) {
        if (node.source?.value) {
          imports.add(node.source.value);
        }
      },
      CallExpression({ node }: any) {
        if (
          node.callee?.name === 'require' &&
          node.arguments?.length > 0 &&
          node.arguments[0]?.type === 'StringLiteral'
        ) {
          imports.add(node.arguments[0].value);
        }
        if (
          node.callee?.type === 'Import' &&
          node.arguments?.length > 0 &&
          node.arguments[0]?.type === 'StringLiteral'
        ) {
          imports.add(node.arguments[0].value);
        }
      },
    });
  } catch {
    // Fallback: Regex matching for imports and requires
    const importRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"])|(?:require\s*\(\s*['"]([^'"]+)['"]\s*\))|(?:import\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const specifier = match[1] || match[2] || match[3];
      if (specifier) {
        imports.add(specifier);
      }
    }
  }

  return Array.from(imports);
}
