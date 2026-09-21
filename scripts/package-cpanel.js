#!/usr/bin/env node
/**
 * Packages Sakafat Global source files into a clean zip archive for cPanel deployment.
 * Excludes local caches, environments, node_modules, .venv, and build outputs.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'sakafat-cpanel-'));
const app = path.join(staging, 'sakafat-app');

const blocked = /^(?:\.env(?:\..*)?|\.DS_Store|node_modules|\.next|\.venv|__pycache__|\.git|mockups|\.pytest_cache|\.local)$/;
const filter = (file) => {
  const base = path.basename(file);
  return !blocked.test(base) && !/\.(?:pyc|log|zip|tar\.gz)$/.test(file);
};

try {
  fs.mkdirSync(app, { recursive: true });

  // Include frontend, backend, scripts, and root files
  for (const name of ['frontend', 'backend', 'scripts', 'README.md', 'DEPLOYMENT.md']) {
    const source = path.join(root, name);
    if (fs.existsSync(source)) {
      fs.cpSync(source, path.join(app, name), { recursive: true, filter });
    }
  }

  const artifact = path.join(root, 'sakafat-cpanel-bundle.zip');
  const temporary = path.join(staging, 'release.zip');

  execFileSync('zip', ['-q', '-r', temporary, 'sakafat-app'], { cwd: staging });
  fs.copyFileSync(temporary, artifact);

  console.log(`Successfully created clean cPanel bundle: ${artifact}`);
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
