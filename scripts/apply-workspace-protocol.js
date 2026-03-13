#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');
const jsconfigPath = path.join(rootPath, 'jsconfig.json');
const packagePaths = [
  path.join(rootPath, 'package.json'),
  path.join(rootPath, 'src', 'addons', 'volto-eea-kitkat', 'package.json'),
];

console.log('📦 Applying workspace protocol for development...');

// Read jsconfig.json to find workspace packages
const jsconfig = JSON.parse(fs.readFileSync(jsconfigPath, 'utf8'));
const workspacePaths = jsconfig.compilerOptions?.paths || {};

// Extract workspace package names (those pointing to addons/*/src)
const workspacePackages = Object.keys(workspacePaths)
  .filter(key => {
    const paths = workspacePaths[key];
    return Array.isArray(paths) && paths.some(p => p.startsWith('addons/'));
  });

if (workspacePackages.length === 0) {
  console.log('⚠️  No workspace packages found in jsconfig.json');
  process.exit(0);
}

console.log(`   Found ${workspacePackages.length} workspace packages in jsconfig.json`);

packagePaths.forEach(packagePath => {
  if (!fs.existsSync(packagePath)) {
    console.log(`   ⚠️  Skipping missing ${path.relative(rootPath, packagePath)}`);
    return;
  }

  const backupPath = `${packagePath}.backup`;
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const packageLabel = path.relative(rootPath, packagePath);

  fs.writeFileSync(backupPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`   ✓ Backed up ${packageLabel}`);

  let updatedCount = 0;
  workspacePackages.forEach(pkg => {
    if (packageJson.dependencies && packageJson.dependencies[pkg]) {
      packageJson.dependencies[pkg] = 'workspace:*';
      updatedCount++;
    }
  });

  console.log(`   ✓ Updated ${updatedCount} dependencies in ${packageLabel} to workspace:*`);

  let removedCount = 0;
  if (packageJson.resolutions) {
    workspacePackages.forEach(pkg => {
      if (packageJson.resolutions[pkg]) {
        delete packageJson.resolutions[pkg];
        removedCount++;
      }
    });
  }

  if (removedCount > 0) {
    console.log(`   ✓ Removed ${removedCount} packages from resolutions in ${packageLabel}`);
  }

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
});

console.log('✅ Workspace protocol applied');
console.log('   Run yarn install with these workspace overrides');
