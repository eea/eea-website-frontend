const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');

const serverBundle = path.resolve(
  process.argv[2] || 'core/packages/volto/build/server.js',
);

if (!fs.existsSync(serverBundle)) {
  console.error(`Server bundle not found: ${serverBundle}`);
  process.exit(1);
}

const source = fs.readFileSync(serverBundle, 'utf8');
const requiredModules = new Set();
const requirePatterns = [
  /\brequire\(["']([^"']+)["']\)/g,
  /\bmodule\.require\(["']([^"']+)["']\)/g,
  /\brequire\.resolve\(["']([^"']+)["']\)/g,
];

requirePatterns.forEach((pattern) => {
  for (const match of source.matchAll(pattern)) {
    requiredModules.add(match[1]);
  }
});

const builtins = new Set([
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]);
const resolutionPaths = [path.dirname(serverBundle)];
const missingModules = [...requiredModules]
  .filter(
    (moduleName) =>
      !builtins.has(moduleName) &&
      !moduleName.startsWith('.') &&
      !moduleName.startsWith('/'),
  )
  .filter((moduleName) => {
    try {
      require.resolve(moduleName, { paths: resolutionPaths });
      return false;
    } catch {
      return true;
    }
  })
  .sort();

if (missingModules.length > 0) {
  console.error('Missing production dependencies required by the SSR bundle:');
  missingModules.forEach((moduleName) => console.error(`- ${moduleName}`));
  process.exit(1);
}

console.log(
  `Verified ${requiredModules.size} server imports: all production dependencies are installed.`,
);
