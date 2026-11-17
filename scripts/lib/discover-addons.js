const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..', '..');
const addonsPath = path.join(rootPath, 'src', 'addons');

const listDirs = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []);

const readPackage = (packagePath) => JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const isDevShell = (packageJson) => typeof packageJson.name === 'string' && packageJson.name.endsWith('-dev');

/**
 * Lists the add-on packages found in the src/addons checkouts.
 *
 * Repositories migrated to the Volto 19 layout keep a "-dev" shell package at
 * the repository root and the published package in `packages/<name>`. For
 * those, only the nested package can be installed as a workspace: the shell
 * depends on `workspace:*` versions of Volto and of the add-on itself, which
 * do not exist in a Volto 18 project.
 *
 * @returns {{ packages: Array<{name: string, packagePath: string}>,
 *   packagePaths: string[], shells: string[] }}
 */
const discoverAddons = () => {
  const packagePaths = [];
  const packages = [];
  const shells = [];

  listDirs(addonsPath).forEach((entry) => {
    const repoPath = path.join(addonsPath, entry);
    const rootPackagePath = path.join(repoPath, 'package.json');

    if (!fs.existsSync(rootPackagePath)) {
      return;
    }

    const rootPackage = readPackage(rootPackagePath);

    if (!isDevShell(rootPackage)) {
      packages.push({ name: rootPackage.name, packagePath: rootPackagePath });
      packagePaths.push(rootPackagePath);
      return;
    }

    shells.push(entry);

    listDirs(path.join(repoPath, 'packages')).forEach((nestedEntry) => {
      const nestedPackagePath = path.join(repoPath, 'packages', nestedEntry, 'package.json');

      if (!fs.existsSync(nestedPackagePath)) {
        return;
      }

      packages.push({
        name: readPackage(nestedPackagePath).name,
        packagePath: nestedPackagePath,
      });
      packagePaths.push(nestedPackagePath);
    });
  });

  return { packages, packagePaths, shells };
};

module.exports = { addonsPath, discoverAddons, rootPath };
