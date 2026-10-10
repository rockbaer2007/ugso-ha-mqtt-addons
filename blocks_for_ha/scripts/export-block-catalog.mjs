import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { customExample } from '../src/custom-example.js';
import { validatePackage, packageZip } from '../src/custom-packages.js';
const args = process.argv.slice(2), destinations = []; let source = customExample;
for (let i = 0; i < args.length; i += 2) {
  if (args[i] === '--dest' && args[i + 1]) destinations.push(resolve(args[i + 1]));
  else if (args[i] === '--source' && args[i + 1]) source = JSON.parse(await readFile(args[i + 1], 'utf8'));
  else throw new Error('Usage: node scripts/export-block-catalog.mjs [--source package.json] --dest directory');
}
if (!destinations.length) destinations.push(resolve('public/packages'));
const pkg = validatePackage(source), base = `${pkg.id}-${pkg.version}`;
for (const destination of destinations) {
  await mkdir(destination, { recursive: true });
  await writeFile(resolve(destination, base + '.json'), JSON.stringify(pkg, null, 2) + '\n');
  await writeFile(resolve(destination, base + '.zip'), packageZip(pkg));
}
console.log(`One validated package exported as matching JSON and ZIP to ${destinations.length} destinations.`);
