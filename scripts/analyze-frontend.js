const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { readFileSync } = require('fs');

function analyzeFrontend(baseDir = 'frontend/src') {
    const structure = {
        pages: {},
        layouts: {},
        components: {},
        relationships: {},
        routes: [],
        dataFiles: {}
    };

    if (!fs.existsSync(baseDir)) {
        console.log(`Frontend directory ${baseDir} not found. Skipping frontend analysis.`);
        return structure;
    }

    // Helper to parse TypeScript/TSX files
    function parseFile(filePath) {
        const content = readFileSync(filePath, 'utf-8');
        return parser.parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy']
        });
    }

    // Extract TypeScript interface/type definitions
    function extractTypes(ast) {
        const types = {};
        traverse(ast, {
            TSInterfaceDeclaration(path) {
                const name = path.node.id.name;
                const props = {};
                path.node.body.body.forEach(prop => {
                    props[prop.key.name] = {
                        type: prop.typeAnnotation.typeAnnotation.type,
                        required: !prop.optional
                    };
                });
                types[name] = props;
            },
            TSTypeAliasDeclaration(path) {
                const name = path.node.id.name;
                types[name] = {
                    type: 'alias',
                    value: path.node.typeAnnotation.type
                };
            }
        });
        return types;
    }

    // Analyze state management
    function analyzeState(ast) {
        const stateInfo = {
            useState: [],
            useReducer: [],
            useContext: [],
            redux: {
                actions: [],
                selectors: []
            }
        };

        traverse(ast, {
            CallExpression(path) {
                if (path.node.callee.name === 'useState') {
                    const stateVar = path.parent.id?.elements?.[0]?.name;
                    if (stateVar) {
                        stateInfo.useState.push(stateVar);
                    }
                }
                if (path.node.callee.name === 'useReducer') {
                    const [reducer, initialState] = path.node.arguments;
                    stateInfo.useReducer.push({
                        reducer: reducer.name,
                        initialState: initialState?.properties?.map(p => p.key.name) || []
                    });
                }
                if (path.node.callee.name === 'useContext') {
                    const context = path.node.arguments[0]?.name;
                    if (context) {
                        stateInfo.useContext.push(context);
                    }
                }
                // Redux hooks
                if (path.node.callee.name === 'useSelector' || 
                    path.node.callee.name === 'useDispatch') {
                    stateInfo.redux.selectors.push(path.node.arguments[0]?.name);
                }
            }
        });

        return stateInfo;
    }

    // Analyze component props and API calls
    function analyzeComponent(ast) {
        const info = {
            props: [],
            apiCalls: [],
            navigationCalls: [],
            stateManagement: null,
            eventHandlers: []
        };

        traverse(ast, {
            // Find component props
            TSTypeAnnotation(path) {
                if (path.parent.type === 'Identifier' && path.parent.name === 'props') {
                    const propsType = path.node.typeAnnotation;
                    if (propsType.type === 'TSTypeReference') {
                        info.props.push({
                            name: propsType.typeName.name,
                            optional: path.parent.optional || false
                        });
                    }
                }
            },
            // Find fetch calls or axios usage
            CallExpression(path) {
                if (path.node.callee.name === 'fetch' || 
                    (path.node.callee.property && path.node.callee.property.name === 'fetch')) {
                    if (path.node.arguments[0] && path.node.arguments[0].value) {
                        info.apiCalls.push({
                            url: path.node.arguments[0].value,
                            method: path.node.arguments[1]?.properties?.find(p => p.key.name === 'method')?.value?.value || 'GET'
                        });
                    }
                }
            },
            // Find event handlers
            FunctionDeclaration(path) {
                if (path.node.id.name.startsWith('handle')) {
                    info.eventHandlers.push({
                        name: path.node.id.name,
                        params: path.node.params.map(p => p.name)
                    });
                }
            },
            // Find navigation (useNavigate, Link components)
            JSXElement(path) {
                if (path.node.openingElement.name.name === 'Link') {
                    const attrs = path.node.openingElement.attributes;
                    const to = attrs.find(a => a.name.name === 'to')?.value?.value;
                    if (to) {
                        info.navigationCalls.push({
                            type: 'Link',
                            to: to
                        });
                    }
                }
            }
        });

        info.stateManagement = analyzeState(ast);
        return info;
    }

    // Analyze data files
    function analyzeDataFile(filePath) {
        try {
            const ast = parseFile(filePath);
            const exports = [];
            const types = extractTypes(ast);

            traverse(ast, {
                ExportNamedDeclaration(path) {
                    if (path.node.declaration) {
                        if (path.node.declaration.type === 'VariableDeclaration') {
                            path.node.declaration.declarations.forEach(d => {
                                exports.push({
                                    name: d.id.name,
                                    type: d.init.type
                                });
                            });
                        }
                    }
                }
            });

            return {
                exports,
                types
            };
        } catch (error) {
            console.error(`Error analyzing data file ${filePath}:`, error);
            return null;
        }
    }

    // Analyze a specific directory (pages, layouts, components)
    function analyzeDirectory(dir, type) {
        const fullPath = path.join(baseDir, dir);
        if (!fs.existsSync(fullPath)) return;

        fs.readdirSync(fullPath).forEach(file => {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                const filePath = path.join(fullPath, file);
                try {
                    const ast = parseFile(filePath);
                    const fileInfo = {
                        name: path.basename(file, path.extname(file)),
                        path: filePath,
                        imports: [],
                        exports: [],
                        types: {},
                        componentInfo: {}
                    };

                    // Extract imports and exports
                    traverse(ast, {
                        ImportDeclaration(path) {
                            fileInfo.imports.push({
                                source: path.node.source.value,
                                specifiers: path.node.specifiers.map(s => ({
                                    type: s.type,
                                    name: s.local.name
                                }))
                            });
                        },
                        ExportDefaultDeclaration(path) {
                            fileInfo.exports.push('default');
                        },
                        ExportNamedDeclaration(path) {
                            if (path.node.declaration && path.node.declaration.declarations) {
                                path.node.declaration.declarations.forEach(d => {
                                    fileInfo.exports.push(d.id.name);
                                });
                            }
                        }
                    });

                    // Extract types and component information
                    fileInfo.types = extractTypes(ast);
                    fileInfo.componentInfo = analyzeComponent(ast);

                    structure[type][fileInfo.name] = fileInfo;
                } catch (error) {
                    console.error(`Error analyzing ${filePath}:`, error);
                }
            }
        });
    }

    // Analyze routes from App.tsx and router configurations
    function analyzeRoutes() {
        const routeFiles = ['App.tsx', 'router.tsx', 'routes.tsx'].map(f => path.join(baseDir, f));
        
        for (const routeFile of routeFiles) {
            if (fs.existsSync(routeFile)) {
                try {
                    const ast = parseFile(routeFile);
                    traverse(ast, {
                        JSXElement(path) {
                            if (path.node.openingElement.name.name === 'Route') {
                                const route = {
                                    path: '',
                                    component: '',
                                    layout: '',
                                    exact: false,
                                    props: {}
                                };

                                path.node.openingElement.attributes.forEach(attr => {
                                    if (attr.name.name === 'path') {
                                        route.path = attr.value.value;
                                    }
                                    if (attr.name.name === 'component' || attr.name.name === 'element') {
                                        route.component = attr.value.expression ? 
                                            attr.value.expression.name : 
                                            attr.value.value;
                                    }
                                    if (attr.name.name === 'exact') {
                                        route.exact = true;
                                    }
                                    // Capture any additional props passed to the route
                                    if (attr.value.expression) {
                                        route.props[attr.name.name] = {
                                            type: attr.value.expression.type,
                                            value: attr.value.expression.name || attr.value.expression.value
                                        };
                                    }
                                });

                                if (route.path) {
                                    structure.routes.push(route);
                                }
                            }
                        }
                    });
                } catch (error) {
                    console.error(`Error analyzing routes in ${routeFile}:`, error);
                }
            }
        }
    }

    // Analyze data directory
    const dataDir = path.join(baseDir, 'data');
    if (fs.existsSync(dataDir)) {
        fs.readdirSync(dataDir).forEach(file => {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                const filePath = path.join(dataDir, file);
                const dataInfo = analyzeDataFile(filePath);
                if (dataInfo) {
                    structure.dataFiles[path.basename(file, path.extname(file))] = dataInfo;
                }
            }
        });
    }

    // Run analysis
    analyzeDirectory('pages', 'pages');
    analyzeDirectory('layouts', 'layouts');
    analyzeDirectory('components', 'components');
    analyzeRoutes();

    return structure;
}

// If running directly
if (require.main === module) {
    const structure = analyzeFrontend();
    console.log(JSON.stringify(structure, null, 2));
} else {
    module.exports = { analyzeFrontend };
}
