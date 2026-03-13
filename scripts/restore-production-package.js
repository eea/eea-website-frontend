#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');
const packagePaths = [
  path.join(rootPath, 'package.json'),
  path.join(rootPath, 'src', 'addons', 'volto-eea-kitkat', 'package.json'),
];

let restoredCount = 0;

packagePaths.forEach(packagePath => {
  const backupPath = `${packagePath}.backup`;
  const packageLabel = path.relative(rootPath, packagePath);

  if (fs.existsSync(backupPath)) {
    if (restoredCount === 0) {
      console.log('🔄 Restoring production package.json files...');
    }

    fs.copyFileSync(backupPath, packagePath);
    fs.unlinkSync(backupPath);
    restoredCount++;
    console.log(`   ✓ Restored ${packageLabel}`);
  } else {
    console.log(`ℹ️  No backup found for ${packageLabel} - unchanged`);
  }
});

if (restoredCount > 0) {
  console.log('✅ Production package.json files restored');
}
