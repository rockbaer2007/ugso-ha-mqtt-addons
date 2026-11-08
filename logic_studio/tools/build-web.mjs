import {build} from 'esbuild';
import {mkdir, copyFile, readFile, writeFile} from 'node:fs/promises';
await mkdir('web/vendor', {recursive: true});
await build({entryPoints: ['frontend/flow-editor.jsx'], bundle: true, format: 'esm',
  outfile: 'web/vendor/flow-editor.js', minify: true, target: ['es2022'],
  legalComments: 'linked', define: {'process.env.NODE_ENV': '"production"'}});
for (const [source, target] of [['react/LICENSE','react-LICENSE.txt'],
  ['react-dom/LICENSE','react-dom-LICENSE.txt'], ['@xyflow/react/LICENSE','xyflow-react-LICENSE.txt'],
  ['@xyflow/system/LICENSE','xyflow-system-LICENSE.txt']]) {
  await copyFile('node_modules/' + source, 'web/vendor/' + target);
}
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const notices = [];
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path || pkg.dev) continue;
  let license = '';
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'LICENSE-MIT']) {
    try { license = await readFile(path + '/' + name, 'utf8'); break; } catch {}
  }
  if (!license) throw Error('License text missing: ' + path);
  notices.push(`${path.replace('node_modules/', '')} ${pkg.version}\n${license}`);
}
await writeFile('web/vendor/THIRD-PARTY-LICENSES.txt', notices.join('\n\n----------------------------------------\n\n'));
console.log('React Flow bundled locally; no CDN or browser-side npm dependency.');
