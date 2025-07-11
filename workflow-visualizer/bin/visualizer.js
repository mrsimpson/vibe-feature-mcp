#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const visualizerDir = join(__dirname, '..');

console.log('🚀 Starting Workflow Visualizer...');
console.log('📁 Directory:', visualizerDir);

// Check if dependencies are installed
import { existsSync } from 'fs';
if (!existsSync(join(visualizerDir, 'node_modules'))) {
  console.log('📦 Installing dependencies...');
  const install = spawn('npm', ['install'], { 
    cwd: visualizerDir, 
    stdio: 'inherit' 
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      startServer();
    } else {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('🌐 Starting development server...');
  const server = spawn('npm', ['run', 'dev'], { 
    cwd: visualizerDir, 
    stdio: 'inherit' 
  });
  
  server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down visualizer...');
    server.kill('SIGINT');
    process.exit(0);
  });
}
