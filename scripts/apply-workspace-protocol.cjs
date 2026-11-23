#!/usr/bin/env node
// Switch the pinned add-ons to their mrs-developer checkouts for development.
//
// package.json pins the released add-on versions, which is what the
// production image and CI install. `make develop` checks the add-ons out
// under packages/, then runs this script to point every checked out add-on
// at its workspace (workspace:*), installs, and restores the production
// files with restore-production-package.cjs.
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');
const packagePath = path.join(rootPath, 'package.json');
const lockfilePath = path.join(rootPath, 'pnpm-lock.yaml');
const packagesPath = path.join(rootPath, 'packages');
const projectName = 'eea-website-frontend';

const backupFile = (filePath) => {
  const backupPath = `${filePath}.backup`;
  if (fs.existsSync(filePath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`   ✓ Backed up ${path.relative(rootPath, filePath)}`);
  }
};

// Add-on checkouts follow the nested layout: packages/<repo>/packages/<name>
const workspacePackages = fs
  .readdirSync(packagesPath)
  .filter((repo) => fs.existsSync(path.join(packagesPath, repo, 'packages')))
  .flatMap((repo) =>
    fs
      .readdirSync(path.join(packagesPath, repo, 'packages'))
      .map((name) =>
        path.join(packagesPath, repo, 'packages', name, 'package.json'),
      ),
  )
  .filter((file) => fs.existsSync(file))
  .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')).name)
  .filter((name) => name && name !== projectName)
  .sort();

console.log('📦 Applying workspace protocol for development...');

if (workspacePackages.length === 0) {
  console.log('⚠️  No add-on checkouts found in packages/');
  process.exit(0);
}

console.log(`   Found ${workspacePackages.length} add-on checkouts in packages/`);

backupFile(lockfilePath);
backupFile(packagePath);

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.pnpm = packageJson.pnpm || {};
packageJson.pnpm.overrides = packageJson.pnpm.overrides || {};

workspacePackages.forEach((name) => {
  packageJson.dependencies[name] = 'workspace:*';
  packageJson.pnpm.overrides[name] = 'workspace:*';
});

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(
  `   ✓ Linked ${workspacePackages.length} add-ons to their workspaces`,
);
console.log('✅ Workspace protocol applied');
