import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'public', 'assets', 'apps');
const platformDirs = new Set(['windows', 'android', 'web']);
const imageExts = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif', '.avif', '.svg', '.ico', '.icns']);
const allowedRootNames = new Set(['icon', 'app']);
const errors = [];

function isImage(name) {
  return imageExts.has(path.extname(name).toLowerCase());
}

function baseName(name) {
  return path.basename(name, path.extname(name)).toLowerCase();
}

async function validateApp(appEntry) {
  if (!appEntry.isDirectory()) return;
  const appDir = path.join(root, appEntry.name);
  const entries = await fs.readdir(appDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) {
      if (!platformDirs.has(entry.name.toLowerCase())) {
        errors.push(`${appEntry.name}: unsupported folder "${entry.name}"; use windows, android, or web`);
      }
      continue;
    }
    if (!entry.isFile() || !isImage(entry.name)) continue;
    if (allowedRootNames.has(baseName(entry.name))) continue;
    errors.push(`${appEntry.name}: screenshot "${entry.name}" is at the app root; move it to ${appEntry.name}/windows, ${appEntry.name}/android, or ${appEntry.name}/web`);
  }
}

let apps = [];
try {
  apps = await fs.readdir(root, { withFileTypes: true });
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

for (const app of apps) await validateApp(app);

if (errors.length) {
  console.error('BassThermal asset layout failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('asset layout passed');
