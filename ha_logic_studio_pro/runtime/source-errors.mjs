import {SourceMap} from 'node:module';

export async function prepareSource(source, language) {
  let code = source;
  let map;
  let offset = 0;
  const file = 'studio-source.js';
  const originalLines = source.split(/\r\n|[\n\r\u2028\u2029]/).length;
  if (language === 'typescript') {
    const {checkTypeScript} = await import('./typescript-check.mjs');
    const diagnostics = checkTypeScript(source);
    if (diagnostics.length) {
      const error = new Error(diagnostics[0].message);
      error.line = diagnostics[0].line;
      error.diagnostics = diagnostics;
      throw error;
    }
    const {default: ts} = await import('typescript');
    const result = ts.transpileModule(source, {
      fileName: 'project.ts', reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, sourceMap: true},
    });
    const diagnostic = result.diagnostics?.find(item => item.category === ts.DiagnosticCategory.Error);
    if (diagnostic) {
      const error = new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      if (diagnostic.file && diagnostic.start !== undefined) {
        error.line = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
      }
      throw error;
    }
    code = result.outputText;
    map = new SourceMap(JSON.parse(result.sourceMapText));
  }
  const generatedLines = code.split(/\r\n|[\n\r\u2028\u2029]/).length;
  return {
    file,
    wrap(prefix, suffix) {
      offset = prefix.split('\n').length - 1;
      return prefix + code + suffix;
    },
    error(message, stack) {
      const error = new Error(String(message ?? 'JavaScript execution failed.').slice(0, 1000));
      for (const match of String(stack ?? '').matchAll(/(?:^|[\s(])studio-source\.js:(\d+)(?::(\d+))?/g)) {
        const generated = Number(match[1]) - offset;
        if (generated < 1 || generated > generatedLines) continue;
        const entry = map?.findEntry(generated - 1, Number(match[2] ?? 1) - 1);
        const line = map ? (entry?.generatedLine === generated - 1 ? entry.originalLine + 1 : 0) : generated;
        if (line > 0 && line <= originalLines) {
          error.line = line;
          break;
        }
      }
      return error;
    },
  };
}
