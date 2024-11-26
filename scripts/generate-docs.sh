#!/bin/bash

# Exit on error
set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Default values
PROJECT_ROOT=${PROJECT_ROOT:-.}
OUTPUT_DIR=${OUTPUT_DIR:-"./project-docs"}

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

# Add frontend structure if it exists
if [ -d "$PROJECT_ROOT/frontend/src" ]; then
    echo "## Frontend Structure" >> "$output_file"
    echo "\`\`\`plaintext" >> "$output_file"
    echo "frontend/src/" >> "$output_file"
    echo "├── pages/           # Page components and routes" >> "$output_file"
    echo "├── components/      # Reusable UI components" >> "$output_file"
    echo "├── layouts/         # Layout components" >> "$output_file"
    echo "├── theme/           # Theme configuration" >> "$output_file"
    echo "└── utils/           # Utility functions" >> "$output_file"
    echo "\`\`\`" >> "$output_file"
    echo "" >> "$output_file"
fi

# Generate Swagger docs if backend exists
if [ -d "$PROJECT_ROOT/backend" ]; then
    echo "Generating Swagger documentation..."
    node "$SCRIPT_DIR/generate-swagger-docs.js"
    if [ -f "temp-swagger-docs.md" ]; then
        cat "temp-swagger-docs.md" >> "$output_file"
        rm "temp-swagger-docs.md"
    fi
fi

# Generate AI-optimized documentation
echo "Generating AI-optimized documentation..."
node "$SCRIPT_DIR/generate-ai-docs.js"

echo "Documentation has been generated:"
echo "1. Full documentation: $output_file"
echo "2. AI-optimized documentation: $OUTPUT_DIR/ai/"
