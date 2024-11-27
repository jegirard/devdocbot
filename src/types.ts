export interface ModuleConfig {
  path: string;
  pattern: string;
  description: string;
}

export interface ServerConfig {
  root: string;
  modules: {
    routes?: ModuleConfig;
    models?: ModuleConfig;
    services?: ModuleConfig;
    [key: string]: ModuleConfig | undefined;
  };
}

export interface ClientConfig {
  root: string;
  modules: {
    pages?: ModuleConfig;
    components?: ModuleConfig;
    [key: string]: ModuleConfig | undefined;
  };
}

export interface ProjectStructure {
  server?: ServerConfig;
  client?: ClientConfig;
}

export interface DocumentationOptions {
  includeSwagger?: boolean;
  swaggerPath?: string;
  includeReadme?: boolean;
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
