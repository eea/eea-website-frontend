#!/usr/bin/env node
// Restore the production package.json and pnpm-lock.yaml backed up by
// apply-workspace-protocol.cjs, so the pinned versions stay in Git.
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');
let restoredCount = 0;

['pnpm-lock.yaml', 'package.json'].forEach((file) => {
  const filePath = path.join(rootPath, file);
  const backupPath = `${filePath}.backup`;

  if (!fs.existsSync(backupPath)) {
    console.log(`ℹ️  No backup found for ${file} - unchanged`);
    return;
  }

  if (restoredCount === 0) {
    console.log('🔄 Restoring production package files...');
  }
  fs.copyFileSync(backupPath, filePath);
  fs.unlinkSync(backupPath);
  restoredCount++;
  console.log(`   ✓ Restored ${file}`);
});

if (restoredCount > 0) {
  console.log('✅ Production package files restored');
}
