import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeConfig(): Promise<void> {
  try {
    // Check if config already exists
    try {
      await fs.access('devdocbot.config.js');
      console.log('Config file already exists. Use --force to overwrite.');
      return;
    } catch {
      // File doesn't exist, continue with creation
    }

    // Read template
    const templatePath = path.join(__dirname, '../../templates/devdocbot.config.template.js');
    const template = await fs.readFile(templatePath, 'utf-8');

    // Write config file
    await fs.writeFile('devdocbot.config.js', template);

    console.log('Created devdocbot.config.js');
    console.log('\nNext steps:');
    console.log('1. Edit devdocbot.config.js to match your project structure');
    console.log('2. Run "devdocbot generate" to create documentation');
    console.log('3. Run "devdocbot query -q \'your question\'" to query your codebase');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error creating config:', error.message);
      process.exit(1);
    }
    throw error;
  }
}

export async function initializeConfigForce(): Promise<void> {
  try {
    // Read template
    const templatePath = path.join(__dirname, '../../templates/devdocbot.config.template.js');
    const template = await fs.readFile(templatePath, 'utf-8');

    // Write config file
    await fs.writeFile('devdocbot.config.js', template);

    console.log('Created devdocbot.config.js');
    console.log('\nNext steps:');
    console.log('1. Edit devdocbot.config.js to match your project structure');
    console.log('2. Run "devdocbot generate" to create documentation');
    console.log('3. Run "devdocbot query -q \'your question\'" to query your codebase');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error creating config:', error.message);
      process.exit(1);
    }
    throw error;
  }
}
