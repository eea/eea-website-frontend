#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');
const addonsPath = path.join(rootPath, 'src', 'addons');
const lockfilePath = path.join(rootPath, 'yarn.lock');
const releaseOnlyPackages = new Set(['@eeacms/countup']);
const releaseOnlyWorkspaceGlobs = ['!src/addons/countup'];

const backupFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const backupPath = `${filePath}.backup`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    return true;
  }

  return false;
};

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

console.log('📦 Applying workspace protocol for development...');

const addonPackages = packagePaths
  .filter((packagePath) => packagePath !== path.join(rootPath, 'package.json'))
  .map((packagePath) => ({
    packagePath,
    name: JSON.parse(fs.readFileSync(packagePath, 'utf8')).name,
  }))
  .filter((pkg) => Boolean(pkg.name));

const workspacePackages = addonPackages
  .map((pkg) => pkg.name)
  .filter((pkgName) => !releaseOnlyPackages.has(pkgName))
  .filter(Boolean);

if (workspacePackages.length === 0) {
  console.log('⚠️  No workspace packages found in src/addons');
  process.exit(0);
}

console.log(
  `   Found ${workspacePackages.length} workspace packages in src/addons`,
);

const releasePackagesFound = addonPackages
  .map((pkg) => pkg.name)
  .filter((pkgName) => releaseOnlyPackages.has(pkgName));

if (releasePackagesFound.length > 0) {
  console.log(
    `   Keeping ${releasePackagesFound.join(', ')} on released packages`,
  );
}

if (backupFile(lockfilePath)) {
  console.log(`   ✓ Backed up ${path.relative(rootPath, lockfilePath)}`);
}

packagePaths.forEach((packagePath) => {
  if (!fs.existsSync(packagePath)) {
    console.log(`   ⚠️  Skipping missing ${path.relative(rootPath, packagePath)}`);
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const packageLabel = path.relative(rootPath, packagePath);

  if (backupFile(packagePath)) {
    console.log(`   ✓ Backed up ${packageLabel}`);
  }

  if (
    packageLabel === 'package.json' &&
    Array.isArray(packageJson.workspaces)
  ) {
    releaseOnlyWorkspaceGlobs.forEach((workspaceGlob) => {
      if (!packageJson.workspaces.includes(workspaceGlob)) {
        packageJson.workspaces.push(workspaceGlob);
      }
    });
  }

  let updatedCount = 0;
  ['dependencies', 'devDependencies'].forEach((section) => {
    if (!packageJson[section]) return;

    workspacePackages.forEach((pkg) => {
      if (packageJson[section][pkg]) {
        packageJson[section][pkg] = 'workspace:*';
        updatedCount++;
      }
    });
  });

  console.log(
    `   ✓ Updated ${updatedCount} dependencies in ${packageLabel} to workspace:*`,
  );

  let removedCount = 0;
  if (packageJson.resolutions) {
    workspacePackages.forEach((pkg) => {
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
