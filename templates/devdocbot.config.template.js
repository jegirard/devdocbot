/** @type {import('@devdocbot/cli').Config} */
module.exports = {
  outputDir: './project-docs',
  structure: {
    server: {
      root: 'server/src',  // Change this to your server source directory
      modules: {
        routes: {
          path: 'routes',
          pattern: '**/*.routes.{ts,js}',
          description: 'API route handlers'
        },
        services: {
          path: 'services',
          pattern: '**/*.service.{ts,js}',
          description: 'Business logic services'
        },
        utils: {
          path: 'utils',
          pattern: '**/*.{ts,js}',
          description: 'Utility functions'
        },
        config: {
          path: 'config',
          pattern: '**/*.{ts,js}',
          description: 'Configuration files'
        }
      }
    },
    client: {
      root: 'client/src',  // Change this to your client source directory
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
        },
        services: {
          path: 'services',
          pattern: '**/*.{ts,js}',
          description: 'API services'
        },
        utils: {
          path: 'utils',
          pattern: '**/*.{ts,js}',
          description: 'Utility functions'
        }
      }
    }
  },
  options: {
    includeSwagger: true,
    swaggerPath: 'server/src/config/swagger.config.ts',  // Change this to your swagger file path
    includeReadme: true
  }
};
