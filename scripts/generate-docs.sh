#!/bin/bash

# Exit on error
set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/project-docs"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Create a consolidated documentation file
output_file="$OUTPUT_DIR/documentation.md"

echo "# Project Documentation" > "$output_file"
echo "Generated at: $(date)" >> "$output_file"
echo "" >> "$output_file"

# Add project overview
echo "## Project Overview" >> "$output_file"
if [ -f "$PROJECT_ROOT/README.md" ]; then
    cat "$PROJECT_ROOT/README.md" >> "$output_file"
else
    echo "No README.md found" >> "$output_file"
fi
echo "" >> "$output_file"

# Add client structure if it exists
if [ -d "$PROJECT_ROOT/client/src" ]; then
    echo "## Client Structure" >> "$output_file"
    echo "\`\`\`plaintext" >> "$output_file"
    echo "client/src/" >> "$output_file"
    echo "├── pages/           # Page components and routes" >> "$output_file"
    echo "├── components/      # Reusable UI components" >> "$output_file"
    echo "├── services/        # API services" >> "$output_file"
    echo "├── types/           # TypeScript types" >> "$output_file"
    echo "└── utils/           # Utility functions" >> "$output_file"
    echo "\`\`\`" >> "$output_file"
    echo "" >> "$output_file"
fi

# Add server structure
if [ -d "$PROJECT_ROOT/server/src" ]; then
    echo "## Server Structure" >> "$output_file"
    echo "\`\`\`plaintext" >> "$output_file"
    echo "server/src/" >> "$output_file"
    echo "├── config/          # Configuration files" >> "$output_file"
    echo "├── controllers/     # Route controllers" >> "$output_file"
    echo "├── middleware/      # Express middleware" >> "$output_file"
    echo "├── models/          # Database models" >> "$output_file"
    echo "├── routes/          # API routes" >> "$output_file"
    echo "├── services/        # Business logic" >> "$output_file"
    echo "├── types/           # TypeScript types" >> "$output_file"
    echo "└── utils/           # Utility functions" >> "$output_file"
    echo "\`\`\`" >> "$output_file"
    echo "" >> "$output_file"
fi

# Copy swagger configuration if it exists
if [ -f "$PROJECT_ROOT/server/src/config/swagger.config.ts" ]; then
    echo "Copying Swagger documentation..."
    mkdir -p "$OUTPUT_DIR/api"
    cp "$PROJECT_ROOT/server/src/config/swagger.config.ts" "$OUTPUT_DIR/api/swagger.json"
fi

# Generate AI-optimized documentation
echo "Generating AI-optimized documentation..."
node "$SCRIPT_DIR/generate-ai-docs"

echo "Documentation has been generated:"
echo "1. Full documentation: $output_file"
echo "2. AI-optimized documentation: $OUTPUT_DIR/ai/"
if [ -f "$OUTPUT_DIR/api/swagger.json" ]; then
    echo "3. API documentation: $OUTPUT_DIR/api/swagger.json"
fi
