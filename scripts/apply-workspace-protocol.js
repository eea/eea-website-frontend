#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const jsconfigPath = path.join(__dirname, '..', 'jsconfig.json');
const packagePath = path.join(__dirname, '..', 'package.json');
const backupPath = path.join(__dirname, '..', 'package.json.backup');

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

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Backup original
fs.writeFileSync(backupPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('   ✓ Backed up package.json');

// Update dependencies to use workspace:*
let updatedCount = 0;
workspacePackages.forEach(pkg => {
  if (packageJson.dependencies && packageJson.dependencies[pkg]) {
    packageJson.dependencies[pkg] = 'workspace:*';
    updatedCount++;
  }
});

console.log(`   ✓ Updated ${updatedCount} dependencies to workspace:*`);

// Remove workspace packages from resolutions
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
  console.log(`   ✓ Removed ${removedCount} packages from resolutions`);
}

// Write updated package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ Workspace protocol applied');
console.log('   Run yarn install with these workspace overrides');
