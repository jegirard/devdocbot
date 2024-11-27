import { Config, ProjectDocumentation, FileContent } from '../types.js';
import path from 'path';
import fs from 'fs/promises';

export async function generateSummaryDoc(config: Config): Promise<void> {
  const documentation: ProjectDocumentation = {};

  // Process server-side code if root is specified
  if (config.structure.server?.root) {
    documentation.server = {};
    const serverPath = config.structure.server.root;
    try {
      const pattern = config.structure.server.pattern || '**/*.{ts,js}';
      const files = await getFiles(serverPath, pattern);
      
      // First, identify all module directories
      const modules = await identifyModules(serverPath);
      console.log('Discovered server modules:', Object.keys(modules));

      // Group files by directory as pseudo-modules
      const filesByDir = groupFilesByDirectory(files, serverPath);
      for (const [dirName, dirFiles] of Object.entries(filesByDir)) {
        documentation.server[dirName] = {
          name: dirName,
          description: modules[dirName] || `Files in ${dirName} directory`,
          files: dirFiles
        };
      }
    } catch (error) {
      console.warn(`Warning: Could not process server code at path '${serverPath}' - Directory may not exist`);
    }
  }

  // Process client-side code if root is specified
  if (config.structure.client?.root) {
    documentation.client = {};
    const clientPath = config.structure.client.root;
    try {
      const pattern = config.structure.client.pattern || '**/*.{tsx,jsx}';
      const files = await getFiles(clientPath, pattern);
      
      // First, identify all module directories
      const modules = await identifyModules(clientPath);
      console.log('Discovered client modules:', Object.keys(modules));

      // Group files by directory as pseudo-modules
      const filesByDir = groupFilesByDirectory(files, clientPath);
      for (const [dirName, dirFiles] of Object.entries(filesByDir)) {
        documentation.client[dirName] = {
          name: dirName,
          description: modules[dirName] || `Files in ${dirName} directory`,
          files: dirFiles
        };
      }
    } catch (error) {
      console.warn(`Warning: Could not process client code at path '${clientPath}' - Directory may not exist`);
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

  // Write modules list to a separate file
  const modulesPath = path.join(config.outputDir, 'modules.md');
  const modulesContent = generateModulesList(documentation);
  await fs.writeFile(modulesPath, modulesContent);
}

function generateModulesList(documentation: ProjectDocumentation): string {
  let markdown = '# Project Modules\n\n';

  if (documentation.server && Object.keys(documentation.server).length > 0) {
    markdown += '## Server Modules\n\n';
    for (const [dirName, module] of Object.entries(documentation.server)) {
      markdown += `### ${module.name}\n\n`;
      markdown += `${module.description}\n\n`;
      markdown += '**Files:**\n\n';
      for (const file of module.files) {
        const basename = path.basename(file.path);
        markdown += `- ${basename}\n`;
      }
      markdown += '\n';
    }
  }

  if (documentation.client && Object.keys(documentation.client).length > 0) {
    markdown += '## Client Modules\n\n';
    for (const [dirName, module] of Object.entries(documentation.client)) {
      markdown += `### ${module.name}\n\n`;
      markdown += `${module.description}\n\n`;
      markdown += '**Files:**\n\n';
      for (const file of module.files) {
        const basename = path.basename(file.path);
        markdown += `- ${basename}\n`;
      }
      markdown += '\n';
    }
  }

  return markdown;
}

function generateMarkdown(documentation: ProjectDocumentation): string {
  let markdown = '# Project Documentation\n\n';

  // Generate table of contents
  markdown += '## Table of Contents\n\n';
  if (documentation.overview) {
    markdown += '- [Overview](#overview)\n';
  }
  markdown += '- [Modules](#modules)\n';
  if (documentation.server && Object.keys(documentation.server).length > 0) {
    markdown += '- [Server Components](#server-components)\n';
    for (const [_, module] of Object.entries(documentation.server)) {
      markdown += `  - [${module.name}](#${module.name.toLowerCase()})\n`;
    }
  }
  if (documentation.client && Object.keys(documentation.client).length > 0) {
    markdown += '- [Client Components](#client-components)\n';
    for (const [_, module] of Object.entries(documentation.client)) {
      markdown += `  - [${module.name}](#${module.name.toLowerCase()})\n`;
    }
  }
  if (documentation.api) {
    markdown += '- [API Documentation](#api-documentation)\n';
  }
  markdown += '\n---\n\n';

  // Add overview if exists
  if (documentation.overview) {
    markdown += '## Overview\n\n';
    markdown += documentation.overview + '\n\n';
  }

  // Add modules section
  markdown += '## Modules\n\n';
  if (documentation.server && Object.keys(documentation.server).length > 0) {
    markdown += '### Server Modules\n\n';
    for (const [_, module] of Object.entries(documentation.server)) {
      markdown += `- **${module.name}**: ${module.description}\n`;
    }
    markdown += '\n';
  }
  if (documentation.client && Object.keys(documentation.client).length > 0) {
    markdown += '### Client Modules\n\n';
    for (const [_, module] of Object.entries(documentation.client)) {
      markdown += `- **${module.name}**: ${module.description}\n`;
    }
    markdown += '\n';
  }

  // Add server documentation if exists
  if (documentation.server && Object.keys(documentation.server).length > 0) {
    markdown += '## Server Components\n\n';
    markdown += 'Server-side code structure:\n\n```\n';
    for (const [dirName, module] of Object.entries(documentation.server)) {
      markdown += `${dirName}/\n`;
      for (const file of module.files) {
        const relativePath = path.relative(path.join(process.cwd(), dirName), file.path);
        markdown += `  ${relativePath}\n`;
      }
    }
    markdown += '```\n\n';

    for (const [dirName, module] of Object.entries(documentation.server)) {
      markdown += `### ${module.name}\n\n`;
      markdown += `${module.description}\n\n`;
      
      markdown += '**Files:**\n\n';
      for (const file of module.files) {
        const relativePath = path.relative(path.join(process.cwd(), dirName), file.path);
        markdown += `- \`${relativePath}\`\n`;
      }
      markdown += '\n';
    }
  }

  // Add client documentation if exists
  if (documentation.client && Object.keys(documentation.client).length > 0) {
    markdown += '## Client Components\n\n';
    markdown += 'Client-side code structure:\n\n```\n';
    for (const [dirName, module] of Object.entries(documentation.client)) {
      markdown += `${dirName}/\n`;
      for (const file of module.files) {
        const relativePath = path.relative(path.join(process.cwd(), dirName), file.path);
        markdown += `  ${relativePath}\n`;
      }
    }
    markdown += '```\n\n';

    for (const [dirName, module] of Object.entries(documentation.client)) {
      markdown += `### ${module.name}\n\n`;
      markdown += `${module.description}\n\n`;
      
      markdown += '**Files:**\n\n';
      for (const file of module.files) {
        const relativePath = path.relative(path.join(process.cwd(), dirName), file.path);
        markdown += `- \`${relativePath}\`\n`;
      }
      markdown += '\n';
    }
  }

  // Add API documentation if exists
  if (documentation.api) {
    markdown += '## API Documentation\n\n';
    markdown += documentation.api + '\n\n';
  }

  return markdown;
}

async function identifyModules(dir: string): Promise<{ [key: string]: string }> {
  const modules: { [key: string]: string } = {};
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const fullPath = path.join(dir, entry.name);
        
        // Check if directory contains module-related files
        try {
          const files = await fs.readdir(fullPath);
          const hasModuleFiles = files.some(file => 
            file.includes('module') || 
            file.includes('controller') || 
            file.includes('service') ||
            file.includes('routes')
          );
          
          if (hasModuleFiles) {
            // Try to find a description from index.ts or similar files
            let description = `${entry.name} module`;
            try {
              const indexContent = await fs.readFile(path.join(fullPath, 'index.ts'), 'utf-8');
              const descMatch = indexContent.match(/\/\*\*([\s\S]*?)\*\//);
              if (descMatch) {
                description = descMatch[1].replace(/\s*\*\s*/g, ' ').trim();
              }
            } catch {
              // No index.ts or no description found, use default
            }
            
            modules[entry.name] = description;
          }
        } catch (error) {
          console.warn(`Warning: Could not process directory '${fullPath}'`);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory '${dir}'`);
  }
  
  return modules;
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
        
        // Skip node_modules and hidden directories
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
            continue;
          }
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

function groupFilesByDirectory(files: FileContent[], rootPath: string): { [key: string]: FileContent[] } {
  const groups: { [key: string]: FileContent[] } = {};
  
  for (const file of files) {
    // Get relative path from root
    const relativePath = path.relative(rootPath, file.path);
    // Get the top-level directory name
    const topDir = relativePath.split(path.sep)[0];
    
    if (!groups[topDir]) {
      groups[topDir] = [];
    }
    groups[topDir].push(file);
  }
  
  return groups;
}
