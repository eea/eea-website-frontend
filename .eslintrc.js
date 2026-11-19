const path = require('path');
const { AddonRegistry } = require('@plone/registry/addon-registry');

const projectRootPath = __dirname;
const coreLocation = path.join(projectRootPath, 'core');
const voltoLocation = path.join(coreLocation, 'packages', 'volto');
const { registry } = AddonRegistry.init(voltoLocation);

const addonAliases = Object.keys(registry.packages).map((packageName) => [
  packageName,
  registry.packages[packageName].modulePath,
]);

module.exports = {
  extends: path.join(voltoLocation, '.eslintrc'),
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['@plone/volto', path.join(voltoLocation, 'src')],
          [
            '@plone/volto-slate',
            path.join(coreLocation, 'packages', 'volto-slate', 'src'),
          ],
          [
            '@plone/registry',
            path.join(coreLocation, 'packages', 'registry', 'src'),
          ],
          [
            'eea-website-frontend',
            path.join(projectRootPath, 'packages', 'eea-website-frontend', 'src'),
          ],
          ...addonAliases,
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
  },
};
