#!/usr/bin/env node
/* Build: concatenate src/*.js + style.css + template.html into a single
   self-contained HTML file that also works from file:// (no modules). */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'src');
const repoOut = path.join(here, 'index.html');
const previewOut = path.join(here, '..', 'neon-rift.html');

const template = fs.readFileSync(path.join(src, 'template.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'style.css'), 'utf8');

const files = fs.readdirSync(src)
  .filter((f) => /^\d+.*\.js$/.test(f))
  .sort();

if (!files.length) {
  console.error('no source files');
  process.exit(1);
}

const js = files
  .map((f) => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(src, f), 'utf8'))
  .join('\n');

const wrapped = `(function () {\n'use strict';\n${js}\n})();`;

const html = template
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => wrapped);

fs.writeFileSync(repoOut, html);
fs.writeFileSync(previewOut, html);
console.log('built', repoOut, (html.length / 1024).toFixed(1) + ' KB', 'from', files.length, 'modules');
console.log('preview copy ->', previewOut);
