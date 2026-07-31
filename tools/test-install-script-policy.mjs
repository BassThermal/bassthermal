import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

const expected = {
  'esbuild@0.27.3': 'node_modules/esbuild',
  'sharp@0.34.5': 'node_modules/sharp',
  'workerd@1.20260507.1': 'node_modules/workerd'
};

assert.deepEqual(pkg.allowScripts, Object.fromEntries(Object.keys(expected).map((key) => [key, true])));
for (const [approval, lockPath] of Object.entries(expected)) {
  const version = approval.slice(approval.lastIndexOf('@') + 1);
  assert.equal(lock.packages?.[lockPath]?.version, version, `${approval} must match package-lock.json`);
}

console.log('install-script approvals are exact and lockfile-pinned');
