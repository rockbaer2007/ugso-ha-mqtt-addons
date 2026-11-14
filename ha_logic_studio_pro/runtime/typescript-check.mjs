import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {dirname, resolve, basename} from 'node:path';

const declarations = readFileSync(new URL('./studio-api.d.ts', import.meta.url), 'utf8');
const projectName = '/studio-project.ts';
const apiName = '/studio-api.d.ts';
const prefix = 'async function studioProject() {\n';
const options = {target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts'], types: [],
  strict: true, noEmit: true, noResolve: true};
const libDirectory = dirname(resolve(ts.getDefaultLibFilePath(options)));

export function checkTypeScript(source) {
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => {
    if (file === projectName) return ts.createSourceFile(file, prefix + source + '\n}', args[0], true);
    if (file === apiName) return ts.createSourceFile(file, declarations, args[0], true);
    if (dirname(resolve(file)) === libDirectory && /^lib\.[a-z0-9.]+\.d\.ts$/.test(basename(file))) {
      return getSourceFile(file, ...args);
    }
  };
  const program = ts.createProgram([projectName, apiName], options, host);
  return ts.getPreEmitDiagnostics(program, program.getSourceFile(projectName)).slice(0, 100).map(item => {
    const message = ts.flattenDiagnosticMessageText(item.messageText, '\n');
    if (item.file?.fileName !== projectName || item.start === undefined) return {message};
    const position = item.file.getLineAndCharacterOfPosition(item.start);
    const last = item.file.getLineAndCharacterOfPosition(prefix.length + source.length);
    return {message, line: Math.max(1, Math.min(position.line, last.line)),
      column: position.line > last.line ? last.character + 1 : position.character + 1};
  });
}
