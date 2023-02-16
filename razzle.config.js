/**
 * Replace with custom razzle config when needed.
 * @module razzle.config
 */
const fs = require('fs');
const CompressionPlugin = require('compression-webpack-plugin'); //gzip
const BrotliPlugin = require('brotli-webpack-plugin'); //brotli

let voltoPath = './node_modules/@plone/volto';

let configFile;
if (fs.existsSync(`${this.projectRootPath}/tsconfig.json`))
  configFile = `${this.projectRootPath}/tsconfig.json`;
else if (fs.existsSync(`${this.projectRootPath}/jsconfig.json`))
  configFile = `${this.projectRootPath}/jsconfig.json`;

if (configFile) {
  const jsConfig = require(configFile).compilerOptions;
  const pathsConfig = jsConfig.paths;
  if (pathsConfig['@plone/volto'])
    voltoPath = `./${jsConfig.baseUrl}/${pathsConfig['@plone/volto'][0]}`;
}

module.exports = require(`${voltoPath}/razzle.config`);

module.exports = {
  ...module.exports,
  plugins: [
    ...module.exports.plugins,
    new CompressionPlugin({
      //gzip plugin
      filename: '[path].gz[query]',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
    new BrotliPlugin({
      //brotli plugin
      asset: '[path].br[query]',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
  ],
};
