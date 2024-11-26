const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

function generateSwaggerDocs(options = {}) {
    const {
        projectRoot = process.env.PROJECT_ROOT || '.',
        title = 'API Documentation',
        version = '1.0.0',
        description = 'API documentation',
        apisPattern = './backend/src/modules/**/controllers/*.ts'
    } = options;

    // Swagger definition
    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title,
                version,
                description
            },
        },
        // Path to the API docs
        apis: [path.join(projectRoot, apisPattern)]
    };

    // Initialize swagger-jsdoc
    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    // Helper function to generate example from schema
    function generateExampleFromSchema(schema) {
        if (!schema) return {};
        
        if (schema.$ref) {
            // Handle references by following the reference path
            const refPath = schema.$ref.split('/').slice(1);
            let current = swaggerSpec;
            for (const part of refPath) {
                current = current[part];
            }
            return generateExampleFromSchema(current);
        }

        if (schema.example) {
            return schema.example;
        }

        if (schema.type === 'object' && schema.properties) {
            const example = {};
            for (const [prop, propSchema] of Object.entries(schema.properties)) {
                example[prop] = generateExampleFromSchema(propSchema);
            }
            return example;
        }

        // Handle different types with meaningful examples
        switch (schema.type) {
            case 'string':
                return schema.example || 'string';
            case 'number':
                return schema.example || 0;
            case 'integer':
                return schema.example || 1;
            case 'boolean':
                return schema.example || false;
            case 'array':
                return schema.example || [generateExampleFromSchema(schema.items)];
            default:
                return schema.example || `<${schema.type || 'any'}>`;
        }
    }

    // Convert swagger paths to markdown
    function convertPathsToMarkdown(paths) {
        let markdown = '## API Documentation\n\n';
        
        for (const [path, methods] of Object.entries(paths)) {
            for (const [method, details] of Object.entries(methods)) {
                markdown += `### ${method.toUpperCase()} ${path}\n\n`;
                
                if (details.summary) {
                    markdown += `${details.summary}\n\n`;
                }
                
                if (details.description) {
                    markdown += `${details.description}\n\n`;
                }

                // Add authentication requirements if specified
                if (details.security) {
                    markdown += '**Security:**\n\n';
                    details.security.forEach(security => {
                        Object.keys(security).forEach(scheme => {
                            markdown += `- Requires ${scheme}\n`;
                        });
                    });
                    markdown += '\n';
                }

                if (details.requestBody) {
                    markdown += '**Request Body:**\n\n';
                    markdown += '```json\n';
                    const schema = details.requestBody.content['application/json'].schema;
                    const example = generateExampleFromSchema(schema);
                    markdown += JSON.stringify(example, null, 2);
                    markdown += '\n```\n\n';
                }

                if (details.responses) {
                    markdown += '**Responses:**\n\n';
                    for (const [code, response] of Object.entries(details.responses)) {
                        markdown += `- ${code}: ${response.description}\n`;
                        if (response.content && response.content['application/json']) {
                            markdown += '```json\n';
                            const schema = response.content['application/json'].schema;
                            const example = generateExampleFromSchema(schema);
                            markdown += JSON.stringify(example, null, 2);
                            markdown += '\n```\n';
                        }
                        markdown += '\n';
                    }
                }
            }
        }
        
        return markdown;
    }

    // Generate markdown documentation
    const markdownContent = convertPathsToMarkdown(swaggerSpec.paths || {});

    return {
        markdown: markdownContent,
        spec: swaggerSpec
    };
}

// If running directly
if (require.main === module) {
    const { markdown } = generateSwaggerDocs();
    // Write to a temporary file that generate-docs.sh can read
    const outputPath = path.join(process.cwd(), 'temp-swagger-docs.md');
    fs.writeFileSync(outputPath, markdown);
    console.log('Swagger documentation generated successfully');
} else {
    module.exports = {
        generateSwaggerDocs
    };
}
