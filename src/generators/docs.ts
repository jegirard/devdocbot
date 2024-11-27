import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { Config, ProjectDocumentation, ModuleDocumentation, FileContent } from '../types';

// Helper function to create directory if it doesn't exist
async function ensureDirectoryExists(dirPath: string) {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

// Read file contents with error handling
async function readFileContent(filePath: string): Promise<string> {
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}`);
        return '';
    }
}

// Generate documentation for a specific module
async function generateModuleDocumentation(
    moduleName: string,
    moduleConfig: any,
    baseDir: string
): Promise<ModuleDocumentation> {
    const fullPath = path.join(baseDir, moduleConfig.path);
    const files: string[] = await glob(path.join(fullPath, moduleConfig.pattern));

    const fileContents: FileContent[] = await Promise.all(
        files.map(async (filePath: string) => ({
            path: path.relative(baseDir, filePath),
            content: await readFileContent(filePath)
        }))
    );

    return {
        name: moduleName,
        description: moduleConfig.description,
        files: fileContents
    };
}

// Convert documentation object to markdown
function convertToMarkdown(docs: ProjectDocumentation): string {
    const sections: string[] = [
        '# Project Documentation',
        `Generated at: ${new Date().toISOString()}\n`
    ];

    // Add overview section if exists
    if (docs.overview) {
        sections.push('## Project Overview\n', docs.overview, '\n');
    }

    // Add server documentation if exists
    if (docs.server) {
        sections.push('## Server Documentation\n');
        for (const [moduleName, module] of Object.entries(docs.server)) {
            sections.push(`### ${moduleName}\n`);
            sections.push(`${module.description}\n`);
            
            module.files.forEach(file => {
                sections.push(`#### ${file.path}\n`);
                sections.push('```typescript');
                sections.push(file.content);
                sections.push('```\n');
            });
        }
    }

    // Add client documentation if exists
    if (docs.client) {
        sections.push('## Client Documentation\n');
        for (const [moduleName, module] of Object.entries(docs.client)) {
            sections.push(`### ${moduleName}\n`);
            sections.push(`${module.description}\n`);
            
            module.files.forEach(file => {
                sections.push(`#### ${file.path}\n`);
                sections.push('```typescript');
                sections.push(file.content);
                sections.push('```\n');
            });
        }
    }

    // Add API documentation if exists
    if (docs.api) {
        sections.push('## API Documentation\n');
        sections.push(docs.api);
    }

    return sections.join('\n');
}

export async function generateDocs(config: Config) {
    const outputDir = path.resolve(config.outputDir);
    await ensureDirectoryExists(outputDir);

    const documentation: ProjectDocumentation = {};

    // Add README if configured
    if (config.options.includeReadme) {
        try {
            documentation.overview = await readFileContent('README.md');
        } catch (error) {
            console.warn('Warning: Could not read README.md');
        }
    }

    // Generate server documentation if configured
    if (config.structure.server?.root) {
        documentation.server = {};
        for (const [moduleName, moduleConfig] of Object.entries(config.structure.server.modules)) {
            if (moduleConfig) {
                documentation.server[moduleName] = await generateModuleDocumentation(
                    moduleName,
                    moduleConfig,
                    config.structure.server.root
                );
            }
        }
    }

    // Generate client documentation if configured
    if (config.structure.client?.root) {
        documentation.client = {};
        for (const [moduleName, moduleConfig] of Object.entries(config.structure.client.modules)) {
            if (moduleConfig) {
                documentation.client[moduleName] = await generateModuleDocumentation(
                    moduleName,
                    moduleConfig,
                    config.structure.client.root
                );
            }
        }
    }

    // Add swagger documentation if configured
    if (config.options.includeSwagger && config.options.swaggerPath) {
        try {
            documentation.api = await readFileContent(config.options.swaggerPath);
        } catch (error) {
            console.warn('Warning: Could not read Swagger configuration');
        }
    }

    // Convert to markdown and write to file
    const markdown = convertToMarkdown(documentation);
    await fs.writeFile(
        path.join(outputDir, 'devdocbot-documentation'),
        markdown
    );
}
