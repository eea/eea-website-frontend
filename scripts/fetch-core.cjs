#!/usr/bin/env node
// Clone only the Volto core listed in mrs.developer.json.
//
// Production images and CI install the add-ons from the registry, at the
// versions pinned in package.json, so they only need the core checkout.
// `make develop` still runs mrs-developer for the core and every add-on.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');
const { core } = JSON.parse(
  fs.readFileSync(path.join(rootPath, 'mrs.developer.json'), 'utf8'),
);
const corePath = path.join(rootPath, core.output || '.', 'core');
const ref = core.tag || core.branch;

if (fs.existsSync(path.join(corePath, '.git'))) {
  console.log(`core/ already exists, leaving it as it is`);
  process.exit(0);
}

console.log(`Cloning ${core.https} (${ref}) into core/`);
execFileSync(
  'git',
  ['clone', '--depth', '1', '--branch', ref, core.https, corePath],
  { stdio: 'inherit' },
);
