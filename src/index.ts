#!/usr/bin/env node --no-deprecation

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import dotenv from 'dotenv';
import { cosmiconfig } from 'cosmiconfig';
import { generateSummaryDoc } from './generators/docs.js';
import { generateVectorDocs } from './generators/vector-docs.js';
import { createVectorStore, getDefaultConfig } from './vectorStore/index.js';
import { initializeConfig, initializeConfigForce } from './commands/init.js';
import { Config } from './types.js';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const program = new Command();

async function loadConfig(): Promise<Config> {
  const explorer = cosmiconfig('devdocbot');
  const result = await explorer.search();
  
  if (!result || result.isEmpty) {
    console.error('No configuration file found. Run "devdocbot init" to create one.');
    process.exit(1);
  }
  
  return result.config;
}

async function vectorQuery(question: string, apiKey: string, config: Config): Promise<string> {
  try {
    // Initialize vector store
    const store = await createVectorStore(getDefaultConfig());
    
    // Search for relevant chunks
    const results = await store.search(question, 5);
    
    if (results.length === 0) {
      return "I couldn't find any relevant information in the codebase.";
    }

    // Format context from results
    const context = results.map(result => {
      const location = result.metadata.path ? `\nLocation: ${result.metadata.path}` : '';
      const type = result.metadata.type ? `\nType: ${result.metadata.type}` : '';
      const lines = result.metadata.startLine ? `\nLines: ${result.metadata.startLine}-${result.metadata.endLine}` : '';
      
      return `---\nContent:${result.content}${location}${type}${lines}\n`;
    }).join('\n');

    const client = new Anthropic({
      apiKey
    });

    const prompt = `
You are a helpful coding assistant. Based on the following code and documentation snippets, please answer this question:

${question}

Here are the relevant sections from the codebase:

${context}

Please provide a clear and concise answer based on the provided context.`;

    console.log('\nSending request to Claude...');
    const startTime = Date.now();

    const message = await client.messages.create({
      model: 'claude-2.1',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Calculate approximate token count (rough estimate)
    const promptTokens = prompt.split(/\s+/).length;
    const responseTokens = message.content.toString().split(/\s+/).length;
    const totalTokens = promptTokens + responseTokens;
    const estimatedCost = (totalTokens / 1000) * 0.01; // $0.01 per 1K tokens

    console.log(`\nRequest Stats:`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Estimated Tokens: ${totalTokens.toLocaleString()} (${promptTokens.toLocaleString()} prompt + ${responseTokens.toLocaleString()} response)`);
    console.log(`Estimated Cost: $${estimatedCost.toFixed(4)}`);

    if (typeof message.content === 'string') {
      return message.content;
    } else if (Array.isArray(message.content) && message.content[0]?.type === 'text') {
      return message.content[0].text;
    }
           
    throw new Error('Unexpected response format from Claude API');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process vector query: ${error.message}`);
    }
    throw error;
  }
}

program
  .name('devdocbot')
  .description('AI-powered documentation generator and query tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new devdocbot configuration file')
  .option('-f, --force', 'Overwrite existing config file')
  .action(async (options) => {
    try {
      if (options.force) {
        await initializeConfigForce();
      } else {
        await initializeConfig();
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  });

program
  .command('generate')
  .description('Generate project documentation and vector store')
  .action(async () => {
    try {
      const config = await loadConfig();
      
      // Generate summary markdown
      await generateSummaryDoc(config);
      console.log('Documentation summary generated successfully!');
      
      // Generate vector store
      await generateVectorDocs(config);
      console.log('Vector store generated successfully!');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  });

program
  .command('query')
  .description('Query documentation using AI')
  .requiredOption('-q, --question <string>', 'question to ask about the documentation')
  .option('-k, --key <string>', 'Claude API key (can also be set via ANTHROPIC_API_KEY environment variable)')
  .action(async (options) => {
    try {
      const apiKey = options.key || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        console.error('Error: Claude API key must be provided either via --key option or ANTHROPIC_API_KEY environment variable');
        process.exit(1);
      }

      const config = await loadConfig();
      const response = await vectorQuery(options.question, apiKey, config);
      console.log('\nAnswer:', response);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  });

program.parse();
