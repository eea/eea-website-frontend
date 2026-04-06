#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');
const addonsPath = path.join(rootPath, 'src', 'addons');
const lockfilePath = path.join(rootPath, 'yarn.lock');

const getPackagePaths = () => {
  const packagePaths = [path.join(rootPath, 'package.json')];

  if (!fs.existsSync(addonsPath)) {
    return packagePaths;
  }

  const addonPackagePaths = fs
    .readdirSync(addonsPath)
    .sort()
    .map((entry) => path.join(addonsPath, entry, 'package.json'))
    .filter((packagePath) => fs.existsSync(packagePath));

  return [...packagePaths, ...addonPackagePaths];
};

const packagePaths = getPackagePaths();

let restoredCount = 0;

const restoreFile = (filePath, label) => {
  const backupPath = `${filePath}.backup`;

  if (fs.existsSync(backupPath)) {
    if (restoredCount === 0) {
      console.log('🔄 Restoring production package files...');
    }

    fs.copyFileSync(backupPath, filePath);
    fs.unlinkSync(backupPath);
    restoredCount++;
    console.log(`   ✓ Restored ${label}`);
  } else {
    console.log(`ℹ️  No backup found for ${label} - unchanged`);
  }
};

restoreFile(lockfilePath, path.relative(rootPath, lockfilePath));
packagePaths.forEach((packagePath) => {
  restoreFile(packagePath, path.relative(rootPath, packagePath));
});

if (restoredCount > 0) {
  console.log('✅ Production package files restored');
}
