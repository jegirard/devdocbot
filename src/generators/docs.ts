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
      
      // First, identify all modules
      const modules = await identifyModules(serverPath);
      console.log('Discovered server modules:', Object.keys(modules));

      // Group files by module
      const filesByModule = groupFilesByModule(files, modules, serverPath);
      for (const [moduleName, moduleFiles] of Object.entries(filesByModule)) {
        documentation.server[moduleName] = {
          name: moduleName,
          description: modules[moduleName] || `${moduleName} module`,
          files: moduleFiles
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
      
      // First, identify all modules
      const modules = await identifyModules(clientPath);
      console.log('Discovered client modules:', Object.keys(modules));

      // Group files by module
      const filesByModule = groupFilesByModule(files, modules, clientPath);
      for (const [moduleName, moduleFiles] of Object.entries(filesByModule)) {
        documentation.client[moduleName] = {
          name: moduleName,
          description: modules[moduleName] || `${moduleName} module`,
          files: moduleFiles
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

      // Extract modules from Swagger tags
      const swaggerModules = extractModulesFromSwagger(swaggerContent);
      if (documentation.server && swaggerModules.length > 0) {
        for (const module of swaggerModules) {
          if (!documentation.server[module.name.toLowerCase()]) {
            documentation.server[module.name.toLowerCase()] = {
              name: module.name,
              description: module.description || `${module.name} module`,
              files: []
            };
          }
        }
      }
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

function extractModulesFromSwagger(swaggerContent: string): Array<{ name: string; description?: string }> {
  try {
    // Look for tags array in Swagger content
    const tagsMatch = swaggerContent.match(/tags:\s*\[([\s\S]*?)\]/);
    if (!tagsMatch) return [];

    const tagsContent = tagsMatch[1];
    const tagMatches = tagsContent.matchAll(/{\s*name:\s*'([^']+)',\s*description:\s*'([^']+)'/g);
    
    const modules = [];
    for (const match of tagMatches) {
      modules.push({
        name: match[1],
        description: match[2]
      });
    }
    return modules;
  } catch {
    return [];
  }
}

async function identifyModules(dir: string): Promise<{ [key: string]: string }> {
  const modules: { [key: string]: string } = {};
  
  async function scan(directory: string) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const fullPath = path.join(directory, entry.name);
          
          // Check if directory contains module-related files
          try {
            const files = await fs.readdir(fullPath);
            const hasModuleFiles = files.some(file => 
              file.includes('module') || 
              file.includes('controller') || 
              file.includes('service') ||
              file.includes('routes') ||
              file.includes('middleware') ||
              file.includes('model') ||
              file.includes('entity')
            );

            // Check if directory name indicates a module
            const isModuleDir = entry.name.includes('module') || 
                              entry.name === 'modules' ||
                              entry.name === 'auth' ||
                              entry.name === 'admin' ||
                              entry.name === 'api' ||
                              entry.name === 'core';
            
            if (hasModuleFiles || isModuleDir) {
              // Try to find a description from index.ts, module.ts, or similar files
              let description = `${entry.name} module`;
              const possibleFiles = ['index.ts', `${entry.name}.module.ts`, 'module.ts'];
              
              for (const file of possibleFiles) {
                try {
                  const content = await fs.readFile(path.join(fullPath, file), 'utf-8');
                  const descMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
                  if (descMatch) {
                    description = descMatch[1].replace(/\s*\*\s*/g, ' ').trim();
                    break;
                  }
                } catch {
                  // File doesn't exist or can't be read, continue to next file
                }
              }
              
              modules[entry.name] = description;
            }

            // Recursively scan subdirectories
            await scan(fullPath);
          } catch (error) {
            console.warn(`Warning: Could not process directory '${fullPath}'`);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory '${directory}'`);
    }
  }
  
  await scan(dir);
  return modules;
}

function groupFilesByModule(files: FileContent[], modules: { [key: string]: string }, rootPath: string): { [key: string]: FileContent[] } {
  const groups: { [key: string]: FileContent[] } = {};
  
  for (const file of files) {
    // Get relative path from root
    const relativePath = path.relative(rootPath, file.path);
    // Find which module this file belongs to
    const moduleName = Object.keys(modules).find(module => 
      relativePath.startsWith(module) || 
      relativePath.includes(`/${module}/`) ||
      relativePath.includes(`\\${module}\\`)
    );
    
    if (moduleName) {
      if (!groups[moduleName]) {
        groups[moduleName] = [];
      }
      groups[moduleName].push(file);
    }
  }
  
  return groups;
}

function generateModulesList(documentation: ProjectDocumentation): string {
  let markdown = '# Project Modules\n\n';

  if (documentation.server && Object.keys(documentation.server).length > 0) {
    markdown += '## Server Modules\n\n';
    for (const [_, module] of Object.entries(documentation.server)) {
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
    for (const [_, module] of Object.entries(documentation.client)) {
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
