#!/usr/bin/env node

/**
 * Generate System Prompt Script
 * 
 * This script generates the system prompt file from the actual state machine
 * definition to ensure it stays in sync with the codebase.
 * 
 * Options:
 * --type=<verbose|simple>  - Select prompt type (default: verbose)
 * --output=<path>          - Specify output file path (default: SYSTEM_PROMPT.md)
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { generateSystemPrompt } from '../system-prompt-generator.js';
import { createLogger } from '../logger.js';

const logger = createLogger('GenerateSystemPrompt');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: 'verbose',
    output: join(process.cwd(), 'SYSTEM_PROMPT.md')
  };

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      const type = arg.split('=')[1];
      if (type === 'verbose' || type === 'simple') {
        options.type = type;
      } else {
        console.warn(`Invalid type: ${type}. Using default: verbose`);
      }
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
      // If path is not absolute, make it relative to current directory
      if (!options.output.startsWith('/')) {
        options.output = join(process.cwd(), options.output);
      }
    }
  }

  return options;
}

async function main() {
  try {
    const options = parseArgs();
    logger.info('Starting system prompt generation', options);
    
    // Generate the system prompt
    const systemPrompt = generateSystemPrompt(options.type === 'simple');
    
    // Write to output file
    await writeFile(options.output, systemPrompt, 'utf-8');
    
    logger.info('System prompt written to file', { 
      outputPath: options.output,
      type: options.type
    });
    
    // Log the generated prompt to console
    console.log('\n' + '='.repeat(80));
    console.log(`GENERATED ${options.type.toUpperCase()} SYSTEM PROMPT`);
    console.log('='.repeat(80));
    console.log(systemPrompt);
    console.log('='.repeat(80));
    console.log(`\nSystem prompt saved to: ${options.output}`);
    console.log(`Type: ${options.type}`);
    console.log(`Length: ${systemPrompt.length} characters`);
    
  } catch (error) {
    logger.error('Failed to generate system prompt', error as Error);
    console.error('Error generating system prompt:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
