# DevDocBot

A CLI tool for generating and querying development documentation using AI and vector search.

## Features

- Generates comprehensive project documentation
- Creates efficient vector-based search index
- Natural language querying
- Intelligent context preservation
- Integration with Claude AI for smart responses
- Automatic code chunking and analysis

## Installation

```bash
npm install -g @devdocbot/cli
```

## Quick Start

1. Initialize configuration:
```bash
# Create a new config file
devdocbot init

# Or force overwrite existing config
devdocbot init --force
```

2. Edit `devdocbot.config.js` to match your project structure

3. Generate documentation:
```bash
devdocbot generate
```

4. Query your codebase:
```bash
devdocbot query -q "How does the authentication system work?"
```

## Configuration

The `devdocbot init` command creates a `devdocbot.config.js` file that you can customize:

```javascript
module.exports = {
  outputDir: './project-docs',
  structure: {
    server: {
      root: 'src',  // Your server source directory
      modules: {
        routes: {
          path: 'routes',
          pattern: '**/*.{ts,js}',
          description: 'API routes'
        },
        // Add more modules as needed
      }
    },
    client: {
      root: 'client/src',  // Your client source directory
      modules: {
        components: {
          path: 'components',
          pattern: '**/*.{tsx,jsx}',
          description: 'React components'
        },
        // Add more modules as needed
      }
    }
  },
  options: {
    includeSwagger: true,
    swaggerPath: './swagger.json',
    includeReadme: true
  }
}
```

## Commands

### Initialize Configuration
```bash
# Create new config
devdocbot init

# Force overwrite existing config
devdocbot init --force
```

### Generate Documentation
```bash
devdocbot generate
```
This command:
1. Creates a comprehensive markdown summary in `project-docs/documentation.md`
2. Generates vector embeddings for efficient searching
3. Processes all source code files
4. Includes documentation files and comments

### Query Documentation
```bash
devdocbot query -q "How does the authentication system work?"
```
The query command:
1. Uses vector similarity to find relevant code sections
2. Provides context-aware answers
3. Shows file locations and line numbers
4. Includes cost and token usage statistics

## Environment Variables

- `ANTHROPIC_API_KEY`: Your Claude API key (required for queries)

## Supported File Types

Source Code:
- TypeScript (*.ts, *.tsx)
- JavaScript (*.js, *.jsx)
- Python (*.py)
- Java (*.java)
- Ruby (*.rb)
- Go (*.go)
- Rust (*.rs)
- C/C++ (*.c, *.cpp, *.h, *.hpp)
- C# (*.cs)
- PHP (*.php)
- Swift (*.swift)
- Kotlin (*.kt)

Documentation:
- Markdown (*.md, *.mdx)
- Text files (*.txt)
- Documentation files (*.doc, *.docx)

## Best Practices

1. Run `generate` when:
   - Adding new code files
   - Making significant changes
   - Updating documentation
   - Starting a new development session

2. Use specific queries:
   - Ask about specific features or components
   - Include technical terms when relevant
   - Questions can be in natural language

## Cost Efficiency

DevDocBot is designed to be cost-efficient:
- Uses local vector search to find relevant code
- Only sends necessary context to Claude AI
- Typically uses ~400-500 tokens per query
- Average query cost: $0.004-$0.005

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details
