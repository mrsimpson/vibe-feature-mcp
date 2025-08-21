#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const visualizerDir = join(__dirname, '..');

console.log('🚀 Starting Workflow Visualizer...');
console.log('📁 Directory:', visualizerDir);

// Check if we're in development (has package.json) or published (pre-built)
const hasPackageJson = existsSync(join(visualizerDir, 'package.json'));
const hasBuiltFiles = existsSync(join(visualizerDir, 'dist', 'index.html'));
const hasNodeModules = existsSync(join(visualizerDir, 'node_modules'));

// For npx usage, we should ALWAYS use built files if they exist
// Only use development mode if we're in actual development (no built files)
if (hasBuiltFiles) {
  // We're in a published package - serve the pre-built files
  console.log('📦 Using pre-built visualizer files...');
  startStaticServer();
} else if (hasPackageJson && !hasBuiltFiles) {
  // We're in development - build and serve
  console.log('🔧 Development mode - building and serving...');

  // Check if dependencies are installed
  if (!hasNodeModules) {
    console.log('📦 Installing dependencies...');
    const install = spawn('npm', ['install'], {
      cwd: visualizerDir,
      stdio: 'inherit',
    });

    install.on('close', code => {
      if (code === 0) {
        startDevServer();
      } else {
        console.error('❌ Failed to install dependencies');
        process.exit(1);
      }
    });
  } else {
    startDevServer();
  }
} else {
  console.error('❌ Neither built files nor source files found');
  process.exit(1);
}

function startDevServer() {
  console.log('🌐 Starting development server...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: visualizerDir,
    stdio: 'inherit',
  });

  server.on('close', code => {
    console.log(`Server exited with code ${code}`);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down visualizer...');
    server.kill('SIGINT');
    process.exit(0);
  });
}

async function startStaticServer() {
  console.log('🌐 Starting static file server...');

  // Use a simple static server
  const { createServer } = await import('node:http');
  const { readFile } = await import('node:fs/promises');
  const { extname } = await import('node:path');

  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const server = createServer(async (req, res) => {
    try {
      let filePath = join(
        visualizerDir,
        'dist',
        req.url === '/' ? 'index.html' : req.url
      );

      // Security check - ensure we're serving from dist directory
      if (!filePath.startsWith(join(visualizerDir, 'dist'))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      console.log(`Serving: ${req.url} -> ${filePath}`);

      const content = await readFile(filePath);
      const ext = extname(filePath);
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end(content);
    } catch (error) {
      console.error(`Error serving ${req.url}:`, error.message);
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    }
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`✅ Workflow Visualizer running at http://localhost:${port}`);
    console.log(
      '📦 Workflows are bundled in the JavaScript - no external files needed!'
    );
    console.log('Press Ctrl+C to stop');
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down visualizer...');
    server.close();
    process.exit(0);
  });
}
