#!/usr/bin/env node

/**
 * Aggressive Lint Auto-Fix Script
 *
 * This script applies automated fixes for common linting issues that oxlint --fix
 * doesn't handle automatically. It processes files in batches and runs tests
 * after each batch to ensure no regressions.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const BATCH_SIZE = 10; // Process files in batches

// File patterns to process
const INCLUDE_PATTERNS = [
  'src/**/*.ts',
  'test/**/*.ts',
  'workflow-visualizer/src/**/*.ts',
];

// Files to exclude
const EXCLUDE_PATTERNS = ['node_modules', 'dist', '.vibe', 'coverage'];

/**
 * Get all TypeScript files to process
 */
function getTypeScriptFiles() {
  const files = [];

  function walkDir(dir) {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
          continue;
        }
        walkDir(fullPath);
      } else if (extname(item) === '.ts' && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(PROJECT_ROOT);
  return files;
}

/**
 * Apply aggressive fixes to a file
 */
function aggressiveFixFile(filePath) {
  console.log(`Processing: ${filePath}`);
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Fix no-explicit-any: Replace 'any' with 'unknown' in safe contexts
  const anyReplacements = [
    // Function parameters
    { from: /\(([^)]*): any\)/g, to: '($1: unknown)' },
    // Variable declarations
    { from: /: any;/g, to: ': unknown;' },
    // Return types (be more careful here)
    { from: /Promise<any>/g, to: 'Promise<unknown>' },
    // Array types
    { from: /any\[\]/g, to: 'unknown[]' },
    // Object types in safe contexts
    { from: /Record<string, any>/g, to: 'Record<string, unknown>' },
  ];

  for (const replacement of anyReplacements) {
    const newContent = content.replace(replacement.from, replacement.to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  // 2. Fix no-unused-vars: Add underscore prefix to unused parameters
  const unusedVarFixes = [
    // Catch parameters
    { from: /} catch \(error\) {/g, to: '} catch (_error) {' },
    { from: /} catch \(jsonError\) {/g, to: '} catch (_jsonError) {' },
    // Function parameters
    {
      from: /\(([^,)]*), (context|args|index|stateName|variables|planFileGuidance|stateMachine): [^)]+\)/g,
      to: '($1, _$2: $3)',
    },
  ];

  for (const replacement of unusedVarFixes) {
    const newContent = content.replace(replacement.from, replacement.to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  // 3. Fix no-array-for-each: Replace forEach with for...of
  // This is more complex and needs careful handling
  const forEachPattern = /(\w+)\.forEach\(\(([^)]+)\) => \{([^}]+)\}\);?/g;
  const forEachMatches = [...content.matchAll(forEachPattern)];

  for (const match of forEachMatches) {
    const [fullMatch, arrayName, params, body] = match;
    // Simple case: single parameter
    if (!params.includes(',')) {
      const replacement = `for (const ${params} of ${arrayName}) {${body}}`;
      content = content.replace(fullMatch, replacement);
      modified = true;
    }
  }

  // 4. Fix no-non-null-assertion: Replace ! with optional chaining where safe
  // Be very careful here - only replace in safe contexts
  const nonNullFixes = [
    // Safe patterns like expect(obj!.prop)
    { from: /expect\(([^!]+)!\./g, to: 'expect($1?.' },
    // Array access patterns
    { from: /\.shift\(\)!/g, to: '.shift()' }, // This one needs manual review
  ];

  for (const replacement of nonNullFixes) {
    const newContent = content.replace(replacement.from, replacement.to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  // 5. Remove unused variables and functions
  const unusedDeclarations = [
    // Remove unused const declarations
    /const (start|projectRoot|conversationState) = [^;]+;?\n/g,
    // Remove unused function declarations
    /function (generateTemplateDescription|capitalizePhase|buildTemplateEnum)\([^{]*\{[^}]*\}\n/g,
  ];

  for (const pattern of unusedDeclarations) {
    const newContent = content.replace(pattern, '');
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

/**
 * Run tests to ensure no regressions
 */
function runTests() {
  try {
    console.log('Running tests...');
    execSync('npm run test:run', { stdio: 'pipe' });
    console.log('✓ Tests passed');
    return true;
  } catch (error) {
    console.error('✗ Tests failed');
    return false;
  }
}

/**
 * Run build to ensure no compilation errors
 */
function runBuild() {
  try {
    console.log('Running build...');
    execSync('npm run build', { stdio: 'pipe' });
    console.log('✓ Build passed');
    return true;
  } catch (error) {
    console.error('✗ Build failed');
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting aggressive lint auto-fix...');

  const files = getTypeScriptFiles();
  console.log(`Found ${files.length} TypeScript files to process`);

  let totalFixed = 0;
  let batchCount = 0;

  // Process files in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    batchCount++;

    console.log(
      `\n📦 Processing batch ${batchCount} (${batch.length} files)...`
    );

    let batchFixed = 0;
    for (const file of batch) {
      if (aggressiveFixFile(file)) {
        batchFixed++;
        totalFixed++;
      }
    }

    if (batchFixed > 0) {
      console.log(`\n🔧 Fixed ${batchFixed} files in batch ${batchCount}`);

      // Run build after each batch
      if (!runBuild()) {
        console.error(`❌ Build failed after batch ${batchCount}. Stopping.`);
        process.exit(1);
      }

      // Run tests after each batch
      if (!runTests()) {
        console.error(`❌ Tests failed after batch ${batchCount}. Stopping.`);
        process.exit(1);
      }
    } else {
      console.log(`No fixes needed in batch ${batchCount}`);
    }
  }

  console.log(`\n✅ Aggressive auto-fix complete!`);
  console.log(`📊 Total files processed: ${files.length}`);
  console.log(`🔧 Total files fixed: ${totalFixed}`);

  // Final lint check
  console.log('\n🔍 Running final lint check...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
  } catch (error) {
    console.log(
      'Some linting issues remain - this is expected for complex cases'
    );
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
