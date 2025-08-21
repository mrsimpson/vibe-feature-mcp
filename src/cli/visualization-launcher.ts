import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the current directory for this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Start the interactive workflow visualizer
 */
export function startVisualizationTool(): void {
  console.log(`
🎉 Starting Workflow Visualizer...

The interactive workflow visualizer provides a web-based interface for
exploring and understanding workflow state machines with beautiful PlantUML diagrams.

Starting development server...
`);

  try {
    // Get the path to the workflow-visualizer directory (up two levels from src/cli)
    const visualizerPath = join(__dirname, '..', '..', 'workflow-visualizer');

    // Check if we're in development or production
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      // Development mode - use npm run dev
      console.log('📦 Installing dependencies...');
      const install = spawn('npm', ['install'], {
        cwd: visualizerPath,
        stdio: 'inherit',
        shell: true,
      });

      install.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('🚀 Starting development server...');
          const dev = spawn('npm', ['run', 'dev'], {
            cwd: visualizerPath,
            stdio: 'inherit',
            shell: true,
          });

          dev.on('close', (code: number | null) => {
            if (code !== 0) {
              console.error('❌ Failed to start development server');
              process.exit(1);
            }
          });
        } else {
          console.error('❌ Failed to install dependencies');
          process.exit(1);
        }
      });
    } else {
      // Production mode - build and serve
      console.log('🏗️  Building visualizer...');
      const build = spawn('npm', ['run', 'build'], {
        cwd: visualizerPath,
        stdio: 'inherit',
        shell: true,
      });

      build.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('🌐 Starting production server...');
          const serve = spawn('npm', ['run', 'preview'], {
            cwd: visualizerPath,
            stdio: 'inherit',
            shell: true,
          });

          serve.on('close', (code: number | null) => {
            if (code !== 0) {
              console.error('❌ Failed to start production server');
              process.exit(1);
            }
          });
        } else {
          console.error('❌ Failed to build visualizer');
          process.exit(1);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error starting workflow visualizer:', error);
    console.log(`
💡 Manual start instructions:
   cd workflow-visualizer
   npm install
   npm run dev
   
   Then open http://localhost:3000 in your browser.
`);
    process.exit(1);
  }
}
