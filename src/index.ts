#!/usr/bin/env node --no-deprecation

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import dotenv from 'dotenv';
import { cosmiconfig } from 'cosmiconfig';
import { generateDocs } from './generators/docs';
import { Config } from './types';

// Load environment variables
dotenv.config();

const program = new Command();

async function loadConfig(): Promise<Config> {
  const explorer = cosmiconfig('devdocbot');
  const result = await explorer.search();
  
  if (!result || result.isEmpty) {
    throw new Error('No configuration file found. Please create a devdocbot.config.js file.');
  }
  
  return result.config;
}

async function loadCustomInstructions(): Promise<string> {
  try {
    const instructionsPath = path.join(__dirname, '..', 'config', 'prompt-instructions.txt');
    return await readFile(instructionsPath, 'utf-8');
  } catch (error) {
    console.warn('Warning: Could not load custom instructions file');
    return '';
  }
}

async function queryMarkdown(filePath: string, question: string, apiKey: string, additionalInstructions?: string): Promise<string> {
  try {
    const [markdownContent, baseInstructions] = await Promise.all([
      readFile(filePath, 'utf-8'),
      loadCustomInstructions()
    ]);
    
    const client = new Anthropic({
      apiKey
    });

    const instructions = [
      baseInstructions,
      additionalInstructions,
    ].filter(Boolean).join('\n\n');

    const prompt = `
${instructions}

Here is a markdown document:

${markdownContent}

Question about this document: ${question}

Please answer the question based solely on the content of the markdown document provided above.
`;

    const message = await client.messages.create({
      model: 'claude-2.1',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    if (typeof message.content === 'string') {
      return message.content;
    } else if (Array.isArray(message.content) && message.content[0]?.type === 'text') {
      return message.content[0].text;
    }
           
    throw new Error('Unexpected response format from Claude API');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process query: ${error.message}`);
    }
    throw error;
  }
}

program
  .name('devdocbot')
  .description('CLI tool to generate and query development documentation')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate project documentation')
  .action(async () => {
    try {
      const config = await loadConfig();
      await generateDocs(config);
      console.log('Documentation generated successfully!');
      console.log(`Output file: ${path.join(config.outputDir, 'devdocbot-documentation')}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  });

program
  .command('query')
  .description('Query documentation using Claude AI')
  .option('-f, --file <path>', 'path to documentation file (defaults to ./project-docs/devdocbot-documentation)')
  .requiredOption('-q, --question <string>', 'question to ask about the documentation')
  .option('-k, --key <string>', 'Claude API key (can also be set via ANTHROPIC_API_KEY environment variable)')
  .option('-i, --instructions <string>', 'Additional instructions for Claude')
  .action(async (options) => {
    try {
      const apiKey = options.key || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        console.error('Error: Claude API key must be provided either via --key option or ANTHROPIC_API_KEY environment variable');
        process.exit(1);
      }

      const config = await loadConfig();
      const defaultPath = path.join(config.outputDir, 'devdocbot-documentation');
      const filePath = path.resolve(options.file || defaultPath);

      const response = await queryMarkdown(filePath, options.question, apiKey, options.instructions);
      console.log('\nAnswer:', response);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  });

program.parse();
