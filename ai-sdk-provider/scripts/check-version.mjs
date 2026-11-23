import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const src = fs.readFileSync(new URL('../src/version.ts', import.meta.url), 'utf8');
const m = src.match(/VERSION = '([^']+)'/);
if (!m || m[1] !== pkg.version) {
  console.error(`src/version.ts says ${m?.[1]}, package.json says ${pkg.version}`);
  process.exit(1);
}
console.log(`version ${pkg.version} ok`);
