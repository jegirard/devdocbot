import { Config, ProjectDocumentation, FileContent } from '../types.js';
import path from 'path';
import fs from 'fs/promises';

export async function generateSummaryDoc(config: Config): Promise<void> {
  const documentation: ProjectDocumentation = {};

  // Process server-side modules if they exist
  if (config.structure.server) {
    documentation.server = {};
    for (const [moduleName, moduleConfig] of Object.entries(config.structure.server.modules)) {
      if (!moduleConfig) continue;

      const modulePath = path.join(config.structure.server.root, moduleConfig.path);
      try {
        const files = await getFiles(modulePath, moduleConfig.pattern);
        
        documentation.server[moduleName] = {
          name: moduleName,
          description: moduleConfig.description,
          files
        };
      } catch (error) {
        console.warn(`Warning: Could not process module '${moduleName}' at path '${modulePath}' - Directory may not exist`);
      }
    }
  }

  // Process client-side modules if they exist
  if (config.structure.client) {
    documentation.client = {};
    for (const [moduleName, moduleConfig] of Object.entries(config.structure.client.modules)) {
      if (!moduleConfig) continue;

      const modulePath = path.join(config.structure.client.root, moduleConfig.path);
      try {
        const files = await getFiles(modulePath, moduleConfig.pattern);
        
        documentation.client[moduleName] = {
          name: moduleName,
          description: moduleConfig.description,
          files
        };
      } catch (error) {
        console.warn(`Warning: Could not process module '${moduleName}' at path '${modulePath}' - Directory may not exist`);
      }
    }
  }

  // Process API documentation if it exists
  if (config.options.includeSwagger && config.options.swaggerPath) {
    try {
      const swaggerContent = await fs.readFile(config.options.swaggerPath, 'utf-8');
      documentation.api = swaggerContent;
    } catch (error) {
      console.warn(`Warning: Could not read swagger file at '${config.options.swaggerPath}'`);
    }
  }

  // Process README if it exists
  if (config.options.includeReadme) {
    try {
      const readmePath = path.join(process.cwd(), 'README.md');
      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      documentation.overview = readmeContent;
    } catch (error) {
      console.warn('Warning: README.md not found or could not be read');
    }
  }

  // Ensure output directory exists
  await fs.mkdir(config.outputDir, { recursive: true });

  // Write documentation to file
  const outputPath = path.join(config.outputDir, 'documentation.md');
  const markdownContent = generateMarkdown(documentation);
  await fs.writeFile(outputPath, markdownContent);
}

function generateMarkdown(documentation: ProjectDocumentation): string {
  let markdown = '# Project Documentation\n\n';

  // Add overview if exists
  if (documentation.overview) {
    markdown += '## Overview\n\n';
    markdown += documentation.overview + '\n\n';
  }

  // Add server documentation if exists
  if (documentation.server && Object.keys(documentation.server).length > 0) {
    markdown += '## Server Components\n\n';
    for (const [moduleName, module] of Object.entries(documentation.server)) {
      markdown += `### ${module.name}\n\n`;
      markdown += `${module.description}\n\n`;
      
      for (const file of module.files) {
        markdown += `#### ${path.basename(file.path)}\n\n`;
        markdown += '```typescript\n';
        markdown += file.content + '\n';
        markdown += '```\n\n';
      }
    }
  }

  // Add client documentation if exists
  if (documentation.client && Object.keys(documentation.client).length > 0) {
    markdown += '## Client Components\n\n';
    for (const [moduleName, module] of Object.entries(documentation.client)) {
      markdown += `### ${module.name}\n\n`;
      markdown += `${module.description}\n\n`;
      
      for (const file of module.files) {
        markdown += `#### ${path.basename(file.path)}\n\n`;
        markdown += '```typescript\n';
        markdown += file.content + '\n';
        markdown += '```\n\n';
      }
    }
  }

  // Add API documentation if exists
  if (documentation.api) {
    markdown += '## API Documentation\n\n';
    markdown += documentation.api + '\n\n';
  }

  return markdown;
}

function globToRegex(pattern: string): string {
  return pattern
    // Escape special regex characters
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Convert glob ** to regex
    .replace(/\*\*/g, '.*')
    // Convert glob * to regex
    .replace(/\*/g, '[^/]*')
    // Handle extensions like {ts,js}
    .replace(/\{([^}]+)\}/g, '($1)');
}

async function getFiles(dir: string, pattern: string): Promise<FileContent[]> {
  const files: FileContent[] = [];
  const regex = new RegExp(globToRegex(pattern));

  async function scan(directory: string) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && regex.test(entry.name)) {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            path: fullPath,
            content
          });
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      console.warn(`Warning: Could not read directory '${directory}'`);
    }
  }

  await scan(dir);
  return files;
}
