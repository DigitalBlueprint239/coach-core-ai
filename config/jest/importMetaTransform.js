/**
 * Custom Jest transformer that handles import.meta.env for CRA projects.
 *
 * Problem: This CRA 5 project uses Vite-style `import.meta.env.VITE_*`
 * throughout, but Jest + babel-jest cannot parse `import.meta` in CJS mode.
 *
 * Solution: String-replace `import.meta.env` → `process.env` BEFORE
 * passing the source to CRA's standard babelTransform. This allows Jest
 * to parse and execute the files without syntax errors.
 *
 * At test runtime, env vars can be set via process.env as usual.
 */
'use strict';

const craTransform = require('react-scripts/config/jest/babelTransform');

module.exports = {
  ...craTransform,
  process(sourceText, sourcePath, options) {
    // Replace import.meta.env.XXX → process.env.XXX
    // Replace import.meta.env (bare object access) → process.env
    const patched = sourceText.replace(/import\.meta\.env/g, 'process.env');
    return craTransform.process(patched, sourcePath, options);
  },
};
