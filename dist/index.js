#!/usr/bin/env node --no-deprecation
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const promises_1 = require("fs/promises");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const cosmiconfig_1 = require("cosmiconfig");
const docs_1 = require("./generators/docs");
// Load environment variables
dotenv_1.default.config();
const program = new commander_1.Command();
async function loadConfig() {
    const explorer = (0, cosmiconfig_1.cosmiconfig)('devdocbot');
    const result = await explorer.search();
    if (!result || result.isEmpty) {
        throw new Error('No configuration file found. Please create a devdocbot.config.js file.');
    }
    return result.config;
}
async function loadCustomInstructions() {
    try {
        const instructionsPath = path_1.default.join(__dirname, '..', 'config', 'prompt-instructions.txt');
        return await (0, promises_1.readFile)(instructionsPath, 'utf-8');
    }
    catch (error) {
        console.warn('Warning: Could not load custom instructions file');
        return '';
    }
}
async function queryMarkdown(filePath, question, apiKey, additionalInstructions) {
    try {
        const [markdownContent, baseInstructions] = await Promise.all([
            (0, promises_1.readFile)(filePath, 'utf-8'),
            loadCustomInstructions()
        ]);
        const client = new sdk_1.default({
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
        }
        else if (Array.isArray(message.content) && message.content[0]?.type === 'text') {
            return message.content[0].text;
        }
        throw new Error('Unexpected response format from Claude API');
    }
    catch (error) {
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
        await (0, docs_1.generateDocs)(config);
        console.log('Documentation generated successfully!');
        console.log(`Output file: ${path_1.default.join(config.outputDir, 'devdocbot-documentation')}`);
    }
    catch (error) {
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
        const defaultPath = path_1.default.join(config.outputDir, 'devdocbot-documentation');
        const filePath = path_1.default.resolve(options.file || defaultPath);
        const response = await queryMarkdown(filePath, options.question, apiKey, options.instructions);
        console.log('\nAnswer:', response);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }
});
program.parse();
