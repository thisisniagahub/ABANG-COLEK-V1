#!/usr/bin/env node
'use strict';
// CLI pemasang pack THEFOUNDER - zero dependency, Node 18+.
// Guna: npx thefounder init [--global|--agent claude|kilo|kilo-global|--target dir] [--json]
//       npx thefounder list | doctor | help
const fs = require('fs');
const path = require('path');
const os = require('os');

const PACK_ROOT = path.resolve(__dirname, '..');
const ROOT_DOCS = ['README.md', 'CHAIN.md', 'SUB-AGENTS.md', 'COMPATIBILITY.md'];
const PLUGIN_DIR = '.claude-plugin';

function skills() {
  return fs.readdirSync(PACK_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('THEFOUNDER-'))
    .map((d) => d.name)
    .sort();
}

function readSkill(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const name = (fm[1].match(/^name:\s*(\S+)/m) || [])[1] || '';
  const dm = fm[1].match(/description: >-\n((?:  [^\n]*\n?)+)/);
  const description = dm ? dm[1].replace(/^  /gm, '').replace(/\s+/g, ' ').trim() : '';
  return { name, description };
}

function copyPack(target) {
  fs.mkdirSync(target, { recursive: true });
  let count = 0;
  for (const s of skills()) { fs.cpSync(path.join(PACK_ROOT, s), path.join(target, s), { recursive: true }); count++; }
  for (const doc of ROOT_DOCS) { const src = path.join(PACK_ROOT, doc); if (fs.existsSync(src)) { fs.cpSync(src, path.join(target, doc)); } }
  const pluginSrc = path.join(PACK_ROOT, PLUGIN_DIR);
  if (fs.existsSync(pluginSrc)) fs.cpSync(pluginSrc, path.join(target, PLUGIN_DIR), { recursive: true });
  return count;
}

function resolveTarget(args) {
  if (args.target) return path.resolve(args.target);
  if (args.global) return path.join(os.homedir(), '.claude', 'skills');
  if (args.agent === 'claude') return path.resolve('.claude', 'skills');
  if (args.agent === 'kilo') return path.resolve('.kilo', 'skills');
  if (args.agent === 'kilo-global') return path.join(os.homedir(), '.config', 'kilo', 'skills');
  return path.resolve('.claude', 'skills');
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || 'help';
  const args = { global: argv.includes('--global'), json: argv.includes('--json') };
  const agentIdx = argv.indexOf('--agent');
  if (agentIdx !== -1 && argv[agentIdx + 1]) args.agent = argv[agentIdx + 1];
  const targetIdx = argv.indexOf('--target');
  if (targetIdx !== -1 && argv[targetIdx + 1]) args.target = argv[targetIdx + 1];

  if (cmd === 'list') {
    for (const s of skills()) {
      const meta = readSkill(path.join(PACK_ROOT, s, 'SKILL.md'));
      console.log(`${s}  -  ${(meta && meta.description || '').slice(0, 90)}...`);
    }
    return 0;
  }
  if (cmd === 'doctor') {
    const fails = [];
    for (const s of skills()) {
      const file = path.join(PACK_ROOT, s, 'SKILL.md');
      if (!fs.existsSync(file)) { fails.push(`${s}: SKILL.md tiada`); continue; }
      const meta = readSkill(file);
      if (!meta) { fails.push(`${s}: frontmatter tidak sah`); continue; }
      if (meta.name !== s) fails.push(`${s}: name (${meta.name}) != folder`);
      if (!/Use when the user says/.test(meta.description)) fails.push(`${s}: tiada ungkapan pencetus`);
    }
    const out = { healthy: fails.length === 0, skills: skills().length, fails };
    console.log(JSON.stringify(out, null, args.json ? 0 : 2));
    return out.healthy ? 0 : 1;
  }
  if (cmd === 'init') {
    const target = resolveTarget(args);
    const count = copyPack(target);
    const out = { installed: count, target };
    console.log(args.json ? JSON.stringify(out) : `${count} skill dipasang ke ${target}`);
    return 0;
  }
  console.log([
    'thefounder - the complete founder pack (27 skills)',
    '',
    '  npx thefounder init [--global] [--agent claude|kilo|kilo-global] [--target dir]',
    '  npx thefounder list      senarai skill + tujuan',
    '  npx thefounder doctor    sahkan integriti pack (exit 1 jika rosak)',
  ].join('\n'));
  return 0;
}
process.exit(main());
