import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {dirname, resolve, basename} from 'node:path';

const declarations = readFileSync(new URL('./studio-api.d.ts', import.meta.url), 'utf8');
const projectName = '/studio-project.ts';
const apiName = '/studio-api.d.ts';
const prefix = 'async function studioProject() {\n';
const options = {target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts'], types: [],
  strict: true, noEmit: true, noResolve: true, allowJs: true};
const libDirectory = dirname(resolve(ts.getDefaultLibFilePath(options)));

export function checkTypeScript(source, modules = []) {
  const host = ts.createCompilerHost(options);
  const moduleFiles = new Map(modules.map(module => [module.file, module]));
  const shared = modules.length ? '\ndeclare const shared: {\n' + modules.map(({id, file}) =>
    'readonly script_' + id + ': typeof import("./' + basename(file).replace(/\.(ts|js)$/, '') + '");').join('\n') + '\n};' : '';
  const fileExists = host.fileExists.bind(host);
  host.fileExists = file => moduleFiles.has(file) || fileExists(file);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => {
    if (file === projectName) return ts.createSourceFile(file, prefix + source + '\n}', args[0], true);
    if (file === apiName) return ts.createSourceFile(file, declarations + shared, args[0], true);
    if (moduleFiles.has(file)) return ts.createSourceFile(file, moduleFiles.get(file).source, args[0], true);
    if (dirname(resolve(file)) === libDirectory && /^lib\.[a-z0-9.]+\.d\.ts$/.test(basename(file))) {
      return getSourceFile(file, ...args);
    }
  };
  const program = ts.createProgram([projectName, apiName, ...moduleFiles.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).slice(0, 100).map(item => {
    const message = ts.flattenDiagnosticMessageText(item.messageText, '\n');
    const module = moduleFiles.get(item.file?.fileName);
    if (module && item.start !== undefined) {
      return {message: module.name + ':' + (item.file.getLineAndCharacterOfPosition(item.start).line + 1) + ' · ' + message};
    }
    if (item.file?.fileName !== projectName || item.start === undefined) return {message};
    const position = item.file.getLineAndCharacterOfPosition(item.start);
    const last = item.file.getLineAndCharacterOfPosition(prefix.length + source.length);
    return {message, line: Math.max(1, Math.min(position.line, last.line)),
      column: position.line > last.line ? last.character + 1 : position.character + 1};
  });
}
