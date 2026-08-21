/* eslint-disable */
const fs = require('fs');
const path = require('path');

const catalogPath = path.resolve(__dirname, 'core/catalog.json');
let catalog = {};

if (fs.existsSync(catalogPath)) {
  catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
} else {
  console.error('Catalog file does not exist at:', catalogPath);
}

module.exports = {
  hooks: {
    updateConfig(config) {
      if (config.catalogs) {
        config.catalogs.default ??= catalog;
      }
      return config;
    },
  },
};
