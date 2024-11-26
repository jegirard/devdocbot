# DevDocBot

A CLI tool designed to enable AI-assisted development by maintaining and querying up-to-date project documentation. DevDocBot automatically generates and consolidates project documentation into a single markdown file, which can then be queried through the Claude AI API, allowing development tools and AI agents to efficiently access project information without having to parse through numerous files.

## Core Concept

DevDocBot serves as a bridge between your project's codebase and AI development tools. Instead of having AI agents parse through numerous project files to understand the codebase, DevDocBot:

1. Regularly generates comprehensive documentation that captures the current state of your project
2. Consolidates this information into a single, queryable markdown file
3. Provides a CLI interface for AI agents to ask questions about the project

This approach significantly improves the efficiency of AI-assisted development by providing a single, authoritative source of project information that can be queried using natural language.

## Integration with AI Development Tools

DevDocBot is designed to work seamlessly with AI development tools. For example, in VS Code with the Cline AI assistant, you can set up the following custom instruction:

```
Always ask at the beginning of a task if the user would like to run the generate-docs script to update the documentation. 

If you have any questions about the project structure or requirements or code, you can use a utility called devDocBot to ask any question about the code, using the following format: 

devdocbot -f <markdown-file> -q "your question"

For <markdown-file> use the documentation.md file in the /project-docs directory

You can rely on the answers you get from devdocbot and don't need to confirm them elsewhere unless you need more help.

If you can't get your answer there, please start with the index.json file in ai-docs and navigate to whatever you need before reading large files directly.
```

This setup ensures that:
1. Documentation is always up-to-date before starting a task
2. AI tools can efficiently query project information
3. Large file reads are minimized by using the consolidated documentation

## Features

- **Automated Documentation Generation**: Regularly update project documentation to maintain an accurate representation of your codebase
- **AI-Optimized Documentation Structure**: 
  - Single markdown file for efficient querying
  - Structured JSON files for detailed navigation
  - Frontend analysis (React/TypeScript)
  - API documentation (Swagger/OpenAPI)
- **AI-Powered Documentation Querying**: Query your project's documentation using Claude AI for natural language answers

## Installation

```bash
# Clone the repository
git clone https://github.com/jegirard/devdocbot.git

# Install dependencies
cd devdocbot
npm install

# Build the project
npm run build

# Link globally
npm link
```

## Project Integration

### 1. Documentation Generation Setup

Create a symlink to DevDocBot's documentation generation script:

```bash
# From your project root
ln -sf path/to/devDocBot/scripts/generate-docs.sh generate-docs.sh
```

Expected directory structure:
```
your-project/
├── generate-docs.sh -> ../path/to/devDocBot/scripts/generate-docs.sh
├── project-docs/    # Generated documentation
│   ├── documentation.md  # Main queryable documentation file
│   └── ai/              # AI-optimized structure
│       └── index.json   # Navigation index for detailed queries
├── frontend/       # If you have a frontend
│   └── src/
└── backend/        # If you have a backend
    └── src/
```

### 2. Regular Documentation Updates

Run the documentation generation script:
```bash
./generate-docs.sh
```

It's recommended to:
- Run this before starting new development tasks
- Include it in your CI/CD pipeline
- Run it after significant code changes

### 3. Querying Documentation

Use the CLI to query project information:

```bash
devdocbot -f project-docs/documentation.md -q "your question"
```

For AI tools, they can use this same command to efficiently gather project information.

## Configuration

### Environment Variables

Create a `.env` file with:

```env
ANTHROPIC_API_KEY=your_claude_api_key
```

### Documentation Generation Options

The generate-docs.sh script uses these environment variables:
- `PROJECT_ROOT`: Root directory of the project to document (default: current directory)
- `OUTPUT_DIR`: Where to output generated documentation (default: ./project-docs)

Example:
```bash
export PROJECT_ROOT=/path/to/your/project
export OUTPUT_DIR=/path/to/output
./generate-docs.sh
```

## Documentation Structure

The generated documentation is organized as:
```
project-docs/
├── documentation.md  # Main queryable documentation file
└── ai/              # AI-optimized documentation structure
    ├── index.json   # Navigation index
    ├── frontend/    # Frontend-specific documentation
    └── auth/        # Authentication documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Dependencies

- `@anthropic-ai/sdk`: Claude AI API client
- `@babel/parser` & `@babel/traverse`: JavaScript/TypeScript parsing
- `commander`: CLI framework
- `swagger-jsdoc`: API documentation generation
