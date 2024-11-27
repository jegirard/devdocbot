/** @type {import('@devdocbot/cli').Config} */
module.exports = {
  // Output directory for generated documentation
  outputDir: './project-docs',
  
  // Project structure configuration
  structure: {
    // Server-side configuration (optional)
    server: {
      // Root directory of server code
      root: 'server/src',
      // Modules to document
      modules: {
        routes: {
          path: 'routes',
          pattern: '**/*.routes.{ts,js}',
          description: 'API route handlers'
        },
        models: {
          path: 'models',
          pattern: '**/*.model.{ts,js}',
          description: 'Database models'
        },
        services: {
          path: 'services',
          pattern: '**/*.service.{ts,js}',
          description: 'Business logic services'
        }
      }
    },
    
    // Client-side configuration (optional)
    client: {
      // Root directory of client code
      root: 'client/src',
      // Modules to document
      modules: {
        pages: {
          path: 'pages',
          pattern: '**/*.{tsx,jsx}',
          description: 'Page components'
        },
        components: {
          path: 'components',
          pattern: '**/*.{tsx,jsx}',
          description: 'Reusable UI components'
        }
      }
    }
  },

  // Documentation generation options
  options: {
    // Include API documentation from Swagger/OpenAPI
    includeSwagger: true,
    swaggerPath: 'server/src/config/swagger.config.ts',
    
    // Include README in documentation
    includeReadme: true
  }
};
