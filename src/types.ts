export interface ModuleConfig {
  path: string;
  pattern: string;
  description: string;
}

export interface ServerConfig {
  root: string;
  pattern?: string;
}

export interface ClientConfig {
  root: string;
  pattern?: string;
}

export interface ProjectStructure {
  server?: ServerConfig;
  client?: ClientConfig;
}

export interface DocumentationOptions {
  includeSwagger?: boolean;
  swaggerPath?: string;
  includeReadme?: boolean;
  useVectorStore?: boolean;
  vectorStorePath?: string;
}

export interface Config {
  outputDir: string;
  structure: ProjectStructure;
  options: DocumentationOptions;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface ModuleDocumentation {
  name: string;
  description: string;
  files: FileContent[];
}

export interface ProjectDocumentation {
  overview?: string;
  server?: {
    [module: string]: ModuleDocumentation;
  };
  client?: {
    [module: string]: ModuleDocumentation;
  };
  api?: string;
}

export interface CodeChunk {
  content: string;
  metadata: {
    path: string;
    type: 'code' | 'documentation' | 'comment';
    module?: string;
    section?: string;
    startLine?: number;
    endLine?: number;
  };
}

export interface VectorStoreConfig {
  collectionName: string;
  dimension: number;
  chunkSize: number;
  chunkOverlap: number;
}

export interface SearchResult {
  content: string;
  metadata: CodeChunk['metadata'];
  similarity: number;
}
