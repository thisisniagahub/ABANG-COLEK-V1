import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = '.';
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx'];
const files = [];
const walk = (dir) => {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!SOURCE_EXTENSIONS.includes(path.extname(entry.name))) continue;
    let content;
    try { content = fs.readFileSync(full, 'utf8'); } catch { continue; }
    const posix = full.replace(/\\/g, '/');
    files.push({ path: path.relative(REPO_ROOT, posix), content });
  }
};
walk(REPO_ROOT);

const srcFiles = files.filter(f => f.path.startsWith('src/') && !f.path.endsWith('.d.ts'));
console.log('Total files:', files.length);
console.log('src/ files:', srcFiles.length);
if (srcFiles.length > 0) {
  console.log('First 10 src files:');
  srcFiles.slice(0, 10).forEach(f => console.log('  ', f.path));
}