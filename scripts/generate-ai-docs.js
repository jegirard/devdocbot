const fs = require('fs');
const path = require('path');

// Helper function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

// Create AI-optimized documentation structure
function generateAIDocs(options = {}) {
    const {
        projectRoot = process.env.PROJECT_ROOT || '.',
        outputDir = process.env.OUTPUT_DIR || './project-docs'
    } = options;

    const baseDir = path.join(outputDir, 'ai');
    const serverDir = path.join(baseDir, 'server');
    const clientDir = path.join(baseDir, 'client');

    // Create necessary directories
    [
        baseDir,
        path.join(baseDir, 'auth'),
        path.join(baseDir, 'auth', 'schemas'),
        clientDir,
        path.join(clientDir, 'pages'),
        path.join(clientDir, 'components'),
        serverDir,
        path.join(serverDir, 'routes'),
        path.join(serverDir, 'models'),
        path.join(serverDir, 'services')
    ].forEach(dir => ensureDirectoryExists(dir));

    // Generate root index.json with dynamic structure based on project
    const rootIndex = {
        version: "1.0.0",
        generated: new Date().toISOString(),
        modules: {}
    };

    // Add server module if it exists
    if (fs.existsSync(path.join(projectRoot, 'server/src'))) {
        rootIndex.modules.server = {
            description: "Backend server implementation",
            path: "server/index.json",
            handles: ["api", "authentication", "document-management", "notifications"]
        };

        // Generate server module index
        const serverIndex = {
            routes: {
                description: "API route handlers",
                path: "routes/index.json",
                endpoints: [
                    "auth.routes.ts",
                    "document.routes.ts",
                    "ai.routes.ts",
                    "notification.routes.ts"
                ]
            },
            models: {
                description: "Database models",
                path: "models/index.json",
                schemas: ["Document", "User"]
            },
            services: {
                description: "Business logic services",
                path: "services/index.json",
                implementations: [
                    "document.service.ts",
                    "auth.service.ts",
                    "notification.service.ts"
                ]
            }
        };

        fs.writeFileSync(
            path.join(serverDir, 'index.json'),
            JSON.stringify(serverIndex, null, 2)
        );
    }

    // Add client module if it exists
    if (fs.existsSync(path.join(projectRoot, 'client/src'))) {
        rootIndex.modules.client = {
            description: "Frontend client application",
            path: "client/index.json",
            handles: ["pages", "components", "document-viewer", "notifications"]
        };

        // Generate client module index
        const clientIndex = {
            description: "Frontend application structure",
            pages: [
                {
                    name: "Dashboard",
                    path: "pages/dashboard.json",
                    description: "Main dashboard view"
                },
                {
                    name: "DocumentViewer",
                    path: "pages/document-viewer.json",
                    description: "Document viewing and analysis"
                }
            ],
            components: [
                {
                    name: "DocumentUpload",
                    path: "components/document-upload.json",
                    description: "Document upload component"
                },
                {
                    name: "DocumentList",
                    path: "components/document-list.json",
                    description: "Document listing component"
                }
            ]
        };

        fs.writeFileSync(
            path.join(clientDir, 'index.json'),
            JSON.stringify(clientIndex, null, 2)
        );
    }

    // Write main index file
    fs.writeFileSync(
        path.join(baseDir, 'index.json'),
        JSON.stringify(rootIndex, null, 2)
    );

    console.log('AI-optimized documentation generated successfully');
}

// If running directly
if (require.main === module) {
    generateAIDocs();
} else {
    module.exports = { generateAIDocs };
}
