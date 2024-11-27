/** @type {import('@devdocbot/cli').Config} */
module.exports = {
  // Output directory for generated documentation
  outputDir: './project-docs',
  
  // Project structure configuration
  structure: {
    // Server-side configuration
    server: {
      // Root directory of server code
      root: 'src',
      // Optional: Pattern for source files (defaults to **/*.{ts,js})
      pattern: '**/*.{ts,js}'
    },
    
    // Client-side configuration (optional)
    client: {
      // Root directory of client code
      root: 'client/src',
      // Optional: Pattern for source files (defaults to **/*.{tsx,jsx})
      pattern: '**/*.{tsx,jsx}'
    }
  },

  // Documentation generation options
  options: {
    // Include API documentation from Swagger
    includeSwagger: true,
    swaggerPath: 'src/config/swagger.ts',
    
    // Include README in documentation
    includeReadme: true
  }
};
