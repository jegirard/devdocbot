const fs = require('fs');
const path = require('path');
const { analyzeFrontend } = require('./analyze-frontend.js');

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
    const frontendDir = path.join(baseDir, 'frontend');
    
    // Create necessary directories
    [
        baseDir,
        path.join(baseDir, 'auth'),
        path.join(baseDir, 'auth', 'schemas'),
        frontendDir,
        path.join(frontendDir, 'pages'),
        path.join(frontendDir, 'layouts'),
        path.join(frontendDir, 'components'),
        path.join(frontendDir, 'data')
    ].forEach(dir => ensureDirectoryExists(dir));

    // Generate root index.json with dynamic structure based on project
    const rootIndex = {
        version: "1.0.0",
        generated: new Date().toISOString(),
        modules: {}
    };

    // Add auth module if it exists
    if (fs.existsSync(path.join(projectRoot, 'backend/src/modules/auth'))) {
        rootIndex.modules.auth = {
            description: "Authentication and authorization system",
            path: "auth/index.json",
            handles: ["login", "registration", "session management"]
        };

        // Generate auth module index
        const authIndex = {
            login: {
                description: "Authenticate user credentials and create session",
                schema: "schemas/login.json",
                related: ["session", "user"]
            },
            register: {
                description: "Create new user account",
                schema: "schemas/register.json",
                related: ["user"]
            }
        };

        fs.writeFileSync(
            path.join(baseDir, 'auth', 'index.json'),
            JSON.stringify(authIndex, null, 2)
        );

        // Generate login schema
        const loginSchema = {
            request: {
                username: "string",
                password: "string"
            },
            response: {
                token: "string",
                refreshToken: "string"
            }
        };

        fs.writeFileSync(
            path.join(baseDir, 'auth', 'schemas', 'login.json'),
            JSON.stringify(loginSchema, null, 2)
        );
    }

    // Add frontend module if it exists
    if (fs.existsSync(path.join(projectRoot, 'frontend'))) {
        rootIndex.modules.frontend = {
            description: "Frontend application structure and components",
            path: "frontend/index.json",
            handles: ["pages", "layouts", "components", "routing", "state management"]
        };

        // Analyze frontend structure
        const frontendStructure = analyzeFrontend(path.join(projectRoot, 'frontend/src'));
        
        // Generate frontend index
        const frontendIndex = {
            description: "Frontend application structure",
            routes: frontendStructure.routes.map(route => ({
                path: route.path,
                component: route.component,
                layout: route.layout,
                exact: route.exact,
                props: route.props
            })),
            pages: Object.keys(frontendStructure.pages).map(pageName => ({
                name: pageName,
                path: `pages/${pageName}.json`,
                description: `${pageName} page component`,
                dependencies: frontendStructure.pages[pageName].imports.map(imp => 
                    typeof imp === 'string' ? imp : imp.source
                ),
                hasApiCalls: frontendStructure.pages[pageName].componentInfo?.apiCalls?.length > 0,
                hasStateManagement: Boolean(frontendStructure.pages[pageName].componentInfo?.stateManagement?.useState?.length || 
                                       frontendStructure.pages[pageName].componentInfo?.stateManagement?.useReducer?.length)
            })),
            layouts: Object.keys(frontendStructure.layouts).map(layoutName => ({
                name: layoutName,
                path: `layouts/${layoutName}.json`,
                description: `${layoutName} layout component`
            })),
            components: Object.keys(frontendStructure.components).map(componentName => ({
                name: componentName,
                path: `components/${componentName}.json`,
                description: `${componentName} reusable component`
            }))
        };

        fs.writeFileSync(
            path.join(frontendDir, 'index.json'),
            JSON.stringify(frontendIndex, null, 2)
        );

        // Generate detailed page documentation
        Object.entries(frontendStructure.pages).forEach(([pageName, pageInfo]) => {
            const pageDoc = {
                name: pageName,
                imports: pageInfo.imports,
                exports: pageInfo.exports,
                types: pageInfo.types,
                componentInfo: {
                    props: pageInfo.componentInfo.props,
                    apiCalls: pageInfo.componentInfo.apiCalls,
                    navigation: pageInfo.componentInfo.navigationCalls,
                    eventHandlers: pageInfo.componentInfo.eventHandlers,
                    stateManagement: pageInfo.componentInfo.stateManagement
                },
                relationships: {
                    layouts: pageInfo.imports.filter(imp => 
                        typeof imp === 'string' ? 
                            imp.includes('layouts/') : 
                            imp.source.includes('layouts/')
                    ),
                    components: pageInfo.imports.filter(imp => 
                        typeof imp === 'string' ? 
                            imp.includes('components/') : 
                            imp.source.includes('components/')
                    ),
                    data: pageInfo.imports.filter(imp => 
                        typeof imp === 'string' ? 
                            imp.includes('data/') : 
                            imp.source.includes('data/')
                    ),
                    navigatesTo: pageInfo.componentInfo.navigationCalls
                }
            };

            fs.writeFileSync(
                path.join(frontendDir, 'pages', `${pageName}.json`),
                JSON.stringify(pageDoc, null, 2)
            );
        });
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
