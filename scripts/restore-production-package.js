#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const backupPath = path.join(__dirname, '..', 'package.json.backup');

if (fs.existsSync(backupPath)) {
  console.log('🔄 Restoring production package.json...');
  fs.copyFileSync(backupPath, packagePath);
  fs.unlinkSync(backupPath);
  console.log('✅ Production package.json restored');
} else {
  console.log('ℹ️  No backup found - package.json unchanged');
}
