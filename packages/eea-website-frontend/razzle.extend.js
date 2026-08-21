const zlib = require('zlib');
const CompressionPlugin = require('compression-webpack-plugin');
const webpack = require('webpack');

const plugins = (defaultPlugins) => defaultPlugins;

const modify = (config) => {
  config.plugins.push(
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      compressionOptions: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        },
      },
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /locale/,
      contextRegExp: /handsontable[/\\]node_modules[/\\]moment/,
    }),
  );

  return config;
};

module.exports = {
  plugins,
  modify,
};
