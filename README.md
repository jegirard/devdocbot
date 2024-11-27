# DevDocBot

A CLI tool to generate and query AI-optimized development documentation. DevDocBot consolidates all project documentation into a single, comprehensive file that can be easily queried using Claude AI.

## Installation

```bash
npm install -g @devdocbot/cli
```

## Configuration

Create a `devdocbot.config.js` file in your project root:

```js
/** @type {import('@devdocbot/cli').Config} */
module.exports = {
  outputDir: './project-docs',
  structure: {
    server: {
      root: 'server/src',
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
    client: {
      root: 'client/src',
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
  options: {
    includeSwagger: true,
    swaggerPath: 'server/src/config/swagger.config.ts',
    includeReadme: true
  }
};
```

## Usage

### Generate Documentation

```bash
devdocbot generate
```

This command will:
1. Read your project configuration from devdocbot.config.js
2. Generate comprehensive documentation based on your project structure
3. Create a single file called 'devdocbot-documentation' in your configured output directory

The generated documentation includes:
- Project overview (from README)
- Server-side code documentation
- Client-side code documentation
- API documentation (if Swagger is configured)

### Query Documentation

```bash
devdocbot query -q "How is authentication handled?"
```

Options:
- `-q, --question`: Question to ask about the documentation (required)
- `-f, --file`: Path to documentation file (defaults to ./project-docs/devdocbot-documentation)
- `-k, --key`: Claude API key (can also be set via ANTHROPIC_API_KEY environment variable)
- `-i, --instructions`: Additional instructions for Claude

## Documentation Structure

The generated 'devdocbot-documentation' file contains:

1. Project Overview
   - Content from README.md (if configured)
   - Project structure overview

2. Server Documentation (if configured)
   - Route handlers
   - Database models
   - Business logic services
   - Other configured server modules

3. Client Documentation (if configured)
   - Pages
   - Components
   - Other configured client modules

4. API Documentation
   - Swagger/OpenAPI documentation (if configured)

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Claude API key for querying documentation

## Customization

You can customize the documentation generation by:

1. Modifying the module patterns in devdocbot.config.js
2. Adding new module types to the structure
3. Configuring additional options in the config file

## Example Configuration for Different Project Types

### Node.js API Project
```js
module.exports = {
  outputDir: './project-docs',
  structure: {
    server: {
      root: 'src',
      modules: {
        controllers: {
          path: 'controllers',
          pattern: '**/*.controller.js',
          description: 'Request handlers'
        },
        models: {
          path: 'models',
          pattern: '**/*.model.js',
          description: 'Data models'
        }
      }
    }
  },
  options: {
    includeReadme: true,
    includeSwagger: true,
    swaggerPath: 'src/swagger.json'
  }
};
```

### React Frontend Project
```js
module.exports = {
  outputDir: './project-docs',
  structure: {
    client: {
      root: 'src',
      modules: {
        components: {
          path: 'components',
          pattern: '**/*.tsx',
          description: 'React components'
        },
        hooks: {
          path: 'hooks',
          pattern: '**/*.ts',
          description: 'Custom React hooks'
        }
      }
    }
  },
  options: {
    includeReadme: true
  }
};
