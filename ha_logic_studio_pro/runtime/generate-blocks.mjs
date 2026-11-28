// Generate saved Blocks JS projects at app startup, without a browser session.
// The generator only emits source; execution stays in the permission-checked runtime.
import {generateBlocks} from '../web/vendor/pro-blocks.js';
let input = '';
process.stdin.setEncoding('utf8');
try {
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 1_000_000) throw Error('Project too large');
  }
  const project = JSON.parse(input);
  if (!project.workspace || typeof project.workspace !== 'object' || Array.isArray(project.workspace)) throw Error('Workspace missing');
  const source = generateBlocks(project.workspace, String(project.name ?? ''));
  if (!source.trim() || Buffer.byteLength(source) > 64_000) throw Error('Invalid generated source');
  process.stdout.write(JSON.stringify({source}));
} catch {
  process.stderr.write('Blocks-JS-Projekt konnte nicht erzeugt werden. Bausteine und Projektgröße prüfen.\n');
  process.exitCode = 1;
}
