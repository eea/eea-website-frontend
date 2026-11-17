#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const { rootPath } = require('./lib/discover-addons');

const addonsPath = path.join(rootPath, 'src', 'addons');
const rootBackups = ['yarn.lock', 'package.json'].map((file) =>
  path.join(rootPath, file),
);
const maxAddonDepth = 4;

const skipDirs = new Set(['.git', 'node_modules', '.yarn']);

const findBackups = (dir, depth) => {
  if (depth > maxAddonDepth || !fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir).flatMap((entry) => {
    const entryPath = path.join(dir, entry);

    if (entry.endsWith('.backup')) {
      return [entryPath];
    }

    if (skipDirs.has(entry) || !fs.statSync(entryPath).isDirectory()) {
      return [];
    }

    return findBackups(entryPath, depth + 1);
  });
};

const backupPaths = [
  ...rootBackups.map((filePath) => `${filePath}.backup`),
  ...findBackups(addonsPath, 0),
].filter((backupPath) => fs.existsSync(backupPath));

let restoredCount = 0;

if (backupPaths.length > 0) {
  console.log('🔄 Restoring production package files...');
}

backupPaths.forEach((backupPath) => {
  const filePath = backupPath.slice(0, -'.backup'.length);

  fs.copyFileSync(backupPath, filePath);
  fs.unlinkSync(backupPath);
  restoredCount++;
  console.log(`   ✓ Restored ${path.relative(rootPath, filePath)}`);
});

const productionPackageJson = fs.readFileSync(
  path.join(rootPath, 'package.json'),
  'utf8',
);

if (productionPackageJson.includes('"workspace:')) {
  console.error(
    '❌ package.json still declares workspace: dependencies after restore, do not commit it',
  );
  process.exit(1);
}

if (restoredCount > 0) {
  console.log('✅ Production package files restored');
}
