import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
        type RouteConfigEntry,
        index,
        route,
} from '@react-router/dev/routes';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

type Tree = {
        path: string;
        children: Tree[];
        hasPage: boolean;
        isParam: boolean;
        paramName: string;
        isCatchAll: boolean;
};

function buildRouteTree(dir: string, basePath = ''): Tree {
        const files = readdirSync(dir);
        const node: Tree = {
                path: basePath,
                children: [],
                hasPage: false,
                isParam: false,
                isCatchAll: false,
                paramName: '',
        };

        // Check if the current directory name indicates a parameter
        const dirName = basePath.split('/').pop();
        if (dirName?.startsWith('[') && dirName.endsWith(']')) {
                node.isParam = true;
                const paramName = dirName.slice(1, -1);

                // Check if it's a catch-all parameter (e.g., [...ids])
                if (paramName.startsWith('...')) {
                        node.isCatchAll = true;
                        node.paramName = paramName.slice(3); // Remove the '...' prefix
                } else {
                        node.paramName = paramName;
                }
        }

        for (const file of files) {
                const filePath = join(dir, file);
                const stat = statSync(filePath);

                if (stat.isDirectory()) {
                        const childPath = basePath ? `${basePath}/${file}` : file;
                        const childNode = buildRouteTree(filePath, childPath);
                        node.children.push(childNode);
                } else if (file === 'page.jsx') {
                        node.hasPage = true;
    }
        }

        return node;
}

function generateRoutes(node: Tree): RouteConfigEntry[] {
        const routes: RouteConfigEntry[] = [];

        if (node.hasPage) {
                const componentPath =
                        node.path === '' ? `./${node.path}page.jsx` : `./${node.path}/page.jsx`;

                if (node.path === '') {
                        routes.push(index(componentPath));
                } else {
                        // Handle parameter routes and route groups
                        let routePath = node.path;

                        // Replace all parameter segments and remove route groups from the path
                        const segments = routePath.split('/');
                        const processedSegments = segments
                                .filter((segment) => {
                                        // Filter out route groups (segments wrapped in parentheses)
                                        return !(segment.startsWith('(') && segment.endsWith(')'));
                                })
                                .map((segment) => {
                                        if (segment.startsWith('[') && segment.endsWith(']')) {
                                                const paramName = segment.slice(1, -1);

                                                // Handle catch-all parameters (e.g., [...ids] becomes *)
                                                if (paramName.startsWith('...')) {
                                                        return '*'; // React Router's catch-all syntax
                                                }
                                                // Handle optional parameters (e.g., [[id]] becomes :id?)
                                                if (paramName.startsWith('[') && paramName.endsWith(']')) {
                                                        return `:${paramName.slice(1, -1)}?`;
                                                }
                                                // Handle regular parameters (e.g., [id] becomes :id)
                                                return `:${paramName}`;
                                        }
                                        return segment;
                                });

                        routePath = processedSegments.join('/');
                        routes.push(route(routePath, componentPath));
                }
        }

        for (const child of node.children) {
                routes.push(...generateRoutes(child));
        }

        return routes;
}
if (import.meta.env.DEV) {
        import.meta.glob('./**/page.jsx', {});
        if (import.meta.hot) {
                import.meta.hot.accept((newSelf) => {
                        import.meta.hot?.invalidate();
                });
        }
}
const tree = buildRouteTree(__dirname);
const notFound = route('*?', './__create/not-found.tsx');
const welcomePage = './(app)/onboarding/welcome/page.jsx';
const rootRedirect = index(welcomePage);
const generatedRoutes = generateRoutes(tree).filter(r => {
        // Filter out index routes (path === undefined) and the onboarding/welcome route (it's now the index)
        if (r.path === undefined) return false;
        if (r.path === 'onboarding/welcome') return false;
        return true;
});
// Add /welcome as an alias route with unique ID
const welcomeAliasRoute = route('welcome', welcomePage, { id: 'welcome-alias' });
const routes = [rootRedirect, welcomeAliasRoute, ...generatedRoutes, notFound];

export default routes;
