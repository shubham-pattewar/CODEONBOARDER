import { describe, it, expect } from 'vitest';
import { parseImports, resolveImportPath } from '../src/pipeline/parser';

describe('Import Parser', () => {
  it('parses standard ES module imports', () => {
    const code = `
      import React, { useState } from 'react';
      import { helper } from './utils/helper';
      import Button from '../components/Button';
    `;
    const imports = parseImports(code, 'src/App.tsx');
    expect(imports).toContain('react');
    expect(imports).toContain('./utils/helper');
    expect(imports).toContain('../components/Button');
  });

  it('parses CommonJS require calls', () => {
    const code = `
      const express = require('express');
      const router = require('./routes/api');
    `;
    const imports = parseImports(code, 'src/server.js');
    expect(imports).toContain('express');
    expect(imports).toContain('./routes/api');
  });

  it('parses export declarations', () => {
    const code = `
      export { default as Header } from './Header';
      export * from './types';
    `;
    const imports = parseImports(code, 'src/index.ts');
    expect(imports).toContain('./Header');
    expect(imports).toContain('./types');
  });

  it('resolves relative file paths and index files correctly', () => {
    const allFiles = new Set([
      'src/server.ts',
      'src/app.ts',
      'src/utils/index.ts',
      'src/components/Button.tsx',
    ]);

    // Resolve ./app
    const res1 = resolveImportPath('./app', 'src/server.ts', allFiles);
    expect(res1).toBe('src/app.ts');

    // Resolve ./utils (index file)
    const res2 = resolveImportPath('./utils', 'src/server.ts', allFiles);
    expect(res2).toBe('src/utils/index.ts');

    // Resolve ../components/Button
    const res3 = resolveImportPath('../components/Button', 'src/utils/index.ts', allFiles);
    expect(res3).toBe('src/components/Button.tsx');

    // Ignore third party
    const res4 = resolveImportPath('express', 'src/server.ts', allFiles);
    expect(res4).toBeNull();
  });

  it('resolves tsconfig path aliases', () => {
    const allFiles = new Set([
      'src/components/Card.tsx',
      'src/utils/math.ts',
    ]);
    const aliases = {
      '@/*': ['src/*'],
    };

    const res = resolveImportPath('@/components/Card', 'src/views/Home.tsx', allFiles, aliases);
    expect(res).toBe('src/components/Card.tsx');
  });

  it('parses and resolves Python imports', () => {
    const pyCode = `
      import os, sys
      import app.services.auth as auth
      from .database import get_db
      from ..models.user import User
    `;
    const imports = parseImports(pyCode, 'app/api/routes.py');
    expect(imports).toContain('os');
    expect(imports).toContain('sys');
    expect(imports).toContain('app.services.auth');
    expect(imports).toContain('.database');
    expect(imports).toContain('..models.user');

    const allFiles = new Set([
      'app/api/routes.py',
      'app/api/database.py',
      'app/models/user.py',
      'app/services/auth.py',
    ]);

    const res1 = resolveImportPath('.database', 'app/api/routes.py', allFiles);
    expect(res1).toBe('app/api/database.py');

    const res2 = resolveImportPath('..models.user', 'app/api/routes.py', allFiles);
    expect(res2).toBe('app/models/user.py');

    const res3 = resolveImportPath('app.services.auth', 'app/api/routes.py', allFiles);
    expect(res3).toBe('app/services/auth.py');
  });

  it('parses and resolves Go imports', () => {
    const goCode = `
      package main
      import (
        "fmt"
        "github.com/myorg/myrepo/pkg/auth"
        "net/http"
      )
    `;
    const imports = parseImports(goCode, 'main.go');
    expect(imports).toContain('fmt');
    expect(imports).toContain('github.com/myorg/myrepo/pkg/auth');
    expect(imports).toContain('net/http');

    const allFiles = new Set([
      'main.go',
      'pkg/auth/service.go',
    ]);

    const res = resolveImportPath('github.com/myorg/myrepo/pkg/auth', 'main.go', allFiles);
    expect(res).toBe('pkg/auth/service.go');
  });

  it('parses and resolves Rust mod and use declarations', () => {
    const rsCode = `
      pub mod config;
      mod utils;
      use crate::models::user;
      use super::service;
    `;
    const imports = parseImports(rsCode, 'src/main.rs');
    expect(imports).toContain('mod:config');
    expect(imports).toContain('mod:utils');
    expect(imports).toContain('use:crate::models::user');
    expect(imports).toContain('use:super::service');

    const allFiles = new Set([
      'src/main.rs',
      'src/config.rs',
      'src/models/user.rs',
    ]);

    const res1 = resolveImportPath('mod:config', 'src/main.rs', allFiles);
    expect(res1).toBe('src/config.rs');

    const res2 = resolveImportPath('use:crate::models::user', 'src/main.rs', allFiles);
    expect(res2).toBe('src/models/user.rs');
  });
});
