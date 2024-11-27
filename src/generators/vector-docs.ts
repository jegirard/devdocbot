import { Config, ProjectDocumentation, FileContent, ModuleDocumentation } from '../types.js';
import { createVectorStore, getDefaultConfig } from '../vectorStore/index.js';
import { createChunker } from '../vectorStore/chunker.js';
import path from 'path';
import fs from 'fs/promises';

const SOURCE_CODE_PATTERN = /\.(ts|js|tsx|jsx|java|py|rb|go|rs|cpp|c|h|hpp|cs|php|swift|kt)$/;

export async function generateVectorDocs(config: Config): Promise<void> {
  // Initialize vector store with default config
  const vectorStore = await createVectorStore(getDefaultConfig());
  const chunker = createChunker();

  try {
    let hasProcessedFiles = false;

    // Process server-side code if root is specified
    if (config.structure.server?.root) {
      console.log(`Processing server source code in ${config.structure.server.root}`);
      try {
        const pattern = config.structure.server.pattern || '**/*.{ts,js}';
        const regex = new RegExp(SOURCE_CODE_PATTERN);
        const files = await getAllFiles(config.structure.server.root, regex);
        
        if (files.length > 0) {
          hasProcessedFiles = true;
          for (const file of files) {
            const relativePath = path.relative(config.structure.server.root, file.path);
            const chunks = chunker.chunkCode(file, `server/${relativePath}`);
            await vectorStore.addChunks(chunks);
          }
        } else {
          console.warn(`Warning: No matching files found in '${config.structure.server.root}'`);
        }
      } catch (error) {
        console.warn(`Warning: Could not process server code at path '${config.structure.server.root}' - Directory may not exist`);
      }
    }

    // Process client-side code if root is specified
    if (config.structure.client?.root) {
      console.log(`Processing client source code in ${config.structure.client.root}`);
      try {
        const pattern = config.structure.client.pattern || '**/*.{tsx,jsx}';
        const regex = new RegExp(SOURCE_CODE_PATTERN);
        const files = await getAllFiles(config.structure.client.root, regex);
        
        if (files.length > 0) {
          hasProcessedFiles = true;
          for (const file of files) {
            const relativePath = path.relative(config.structure.client.root, file.path);
            const chunks = chunker.chunkCode(file, `client/${relativePath}`);
            await vectorStore.addChunks(chunks);
          }
        } else {
          console.warn(`Warning: No matching files found in '${config.structure.client.root}'`);
        }
      } catch (error) {
        console.warn(`Warning: Could not process client code at path '${config.structure.client.root}' - Directory may not exist`);
      }
    }

    // Process API documentation if it exists
    if (config.options.includeSwagger && config.options.swaggerPath) {
      try {
        console.log('Processing API documentation');
        const swaggerContent = await fs.readFile(config.options.swaggerPath, 'utf-8');
        const chunks = chunker.chunkDocumentation(swaggerContent, 'API Documentation');
        await vectorStore.addChunks(chunks);
        hasProcessedFiles = true;
      } catch (error) {
        console.warn(`Warning: Could not read swagger file at '${config.options.swaggerPath}'`);
      }
    }

    // Process README if it exists
    if (config.options.includeReadme) {
      try {
        console.log('Processing README');
        const readmePath = path.join(process.cwd(), 'README.md');
        const readmeContent = await fs.readFile(readmePath, 'utf-8');
        const chunks = chunker.chunkDocumentation(readmeContent, 'Project Overview');
        await vectorStore.addChunks(chunks);
        hasProcessedFiles = true;
      } catch (error) {
        console.warn('Warning: README.md not found or could not be read');
      }
    }

    // Process any additional documentation files in the project
    try {
      console.log('Processing additional documentation files');
      const docFiles = await getDocumentationFiles(process.cwd());
      if (docFiles.length > 0) {
        hasProcessedFiles = true;
        for (const file of docFiles) {
          const chunks = chunker.chunkDocumentation(file.content, file.path);
          await vectorStore.addChunks(chunks);
        }
      }
    } catch (error) {
      console.warn('Warning: Error processing additional documentation');
    }

    if (!hasProcessedFiles) {
      console.warn('\nWarning: No files were processed. Please check your configuration and directory structure.');
      console.log('\nTroubleshooting tips:');
      console.log('1. Ensure your source directories exist');
      console.log('2. Check file patterns in your config match your files');
      console.log('3. Run "devdocbot init" to create a new config if needed');
      return;
    }

    // Save vector store path in config if specified
    if (config.options.vectorStorePath) {
      console.log(`Saving vector store metadata to ${config.options.vectorStorePath}`);
      await fs.writeFile(
        config.options.vectorStorePath,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          config: getDefaultConfig()
        })
      );
    }

  } catch (error) {
    console.error('Error generating vector documentation:', error);
    throw error;
  }
}

async function getAllFiles(dir: string, pattern: RegExp): Promise<FileContent[]> {
  const files: FileContent[] = [];
  
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
        } else if (entry.isFile() && pattern.test(entry.name)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            files.push({
              path: fullPath,
              content
            });
          } catch (error) {
            console.warn(`Warning: Could not read file '${fullPath}'`);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
      throw new Error(`Could not read directory '${directory}'`);
    }
  }

  await scan(dir);
  return files;
}

async function getDocumentationFiles(dir: string): Promise<FileContent[]> {
  const files: FileContent[] = [];
  const DOC_PATTERN = /\.(md|mdx|txt|doc|docx)$/;
  
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
        } else if (entry.isFile() && DOC_PATTERN.test(entry.name)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            files.push({
              path: fullPath,
              content
            });
          } catch (error) {
            console.warn(`Warning: Could not read documentation file '${fullPath}'`);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory '${directory}'`);
    }
  }

  await scan(dir);
  return files;
}
