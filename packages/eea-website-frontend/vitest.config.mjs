import { defineConfig } from 'vitest/config';
import voltoVitestConfig from '@plone/volto/vitest.config.mjs';
import path from 'path';

export default defineConfig({
  ...voltoVitestConfig,
  resolve: {
    alias: {
      '@plone/volto': path.resolve(
        __dirname,
        '../../core/packages/volto/src',
      ),
    },
  },
});
