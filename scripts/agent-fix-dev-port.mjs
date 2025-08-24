#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const PORT = process.env.PORT || process.argv[2] || '3001';
const pkgPath = 'web/package.json';

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.scripts ??= {};

let dev = pkg.scripts.dev || 'next dev';
dev = dev.replace(/\s+(?:-p|--port)\s+\d+/g,'').trim();
pkg.scripts.dev = `${dev} -p ${PORT}`;

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✅ web/package.json normalized. dev="${pkg.scripts.dev}"`);
