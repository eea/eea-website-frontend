#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const { discoverAddons, rootPath } = require('./lib/discover-addons');

const rootPackagePath = path.join(rootPath, 'package.json');
const lockfilePath = path.join(rootPath, 'yarn.lock');
const managedWorkspaceGlobs = ['src/addons/*', 'src/addons/*/packages/*'];
const releaseOnlyPackages = new Set(['@eeacms/countup']);
const releaseOnlyWorkspaceGlobs = ['!src/addons/countup'];

const { packages, packagePaths, shells } = discoverAddons();

const shellWorkspaceGlobs = shells.map((shell) => `!src/addons/${shell}`);
const workspacePackages = packages.map((pkg) => pkg.name).filter((pkgName) => pkgName && !releaseOnlyPackages.has(pkgName));
const addonPackagePaths = new Set(packagePaths);
const allPackagePaths = [rootPackagePath, ...packagePaths];

const backupFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.copyFileSync(filePath, `${filePath}.backup`);
  return true;
};

const isManagedWorkspaceGlob = (workspaceGlob) => managedWorkspaceGlobs.includes(workspaceGlob) || workspaceGlob.startsWith('!src/addons/');

/**
 * Rewrites the workspaces of the project so that the dev checkouts are
 * installable while the "-dev" shells stay out of the graph.
 *
 * Yarn applies the globs in order and a negated directory also removes its
 * descendants, so the exclusions have to be listed before the nested
 * `src/addons/*/ packages; /*` glob, otherwise the real add-on package of a
 * Volto 19 repository is pruned together with its shell.
 */
const applyWorkspaceGlobs = (packageJson) => {
  if (!Array.isArray(packageJson.workspaces)) {
    return;
  }

  const otherWorkspaceGlobs = packageJson.workspaces.filter((workspaceGlob) => !isManagedWorkspaceGlob(workspaceGlob));

  packageJson.workspaces = ['src/addons/*', ...shellWorkspaceGlobs, ...releaseOnlyWorkspaceGlobs, 'src/addons/*/packages/*', ...otherWorkspaceGlobs];
};

const dropUnresolvableWorkspaceDeps = (packageJson, packageLabel) => {
  if (!addonPackagePaths.has(packageLabel)) {
    return 0;
  }

  let removedCount = 0;

  ['dependencies', 'devDependencies', 'optionalDependencies'].forEach((section) => {
    const deps = packageJson[section];

    if (!deps) return;

    Object.keys(deps).forEach((pkg) => {
      const isWorkspaceDep = typeof deps[pkg] === 'string' && deps[pkg].startsWith('workspace:');

      if (isWorkspaceDep && !workspacePackages.includes(pkg)) {
        delete deps[pkg];
        removedCount++;
      }
    });

    if (Object.keys(deps).length === 0) {
      delete packageJson[section];
    }
  });

  return removedCount;
};

console.log('📦 Applying workspace protocol for development...');

if (workspacePackages.length === 0 && shells.length === 0) {
  console.log('⚠️  No workspace packages found in src/addons');
  process.exit(0);
}

console.log(`   Found ${workspacePackages.length} workspace packages in src/addons`);

if (shells.length > 0) {
  console.log(`   Excluding Volto 19 dev shells: ${shells.join(', ')}`);
}

const releasePackagesFound = workspacePackages.filter((pkgName) => releaseOnlyPackages.has(pkgName));

if (releasePackagesFound.length > 0) {
  console.log(`   Keeping ${releasePackagesFound.join(', ')} on released packages`);
}

if (backupFile(lockfilePath)) {
  console.log(`   ✓ Backed up ${path.relative(rootPath, lockfilePath)}`);
}

allPackagePaths.forEach((packagePath) => {
  if (!fs.existsSync(packagePath)) {
    console.log(`   ⚠️  Skipping missing ${path.relative(rootPath, packagePath)}`);
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const packageLabel = path.relative(rootPath, packagePath);

  if (backupFile(packagePath)) {
    console.log(`   ✓ Backed up ${packageLabel}`);
  }

  if (packagePath === rootPackagePath) {
    applyWorkspaceGlobs(packageJson);
  }

  const droppedCount = dropUnresolvableWorkspaceDeps(packageJson, packagePath);

  if (droppedCount > 0) {
    console.log(`   ✓ Dropped ${droppedCount} unresolvable workspace dependencies in ${packageLabel}`);
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

  console.log(`   ✓ Updated ${updatedCount} dependencies in ${packageLabel} to workspace:*`);

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
