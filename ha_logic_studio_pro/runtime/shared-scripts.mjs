import ts from 'typescript';

export function prepareLibraries(libraries) {
  return libraries.map(({id, name, source, language}) => {
    const file = '/shared-' + id + (language === 'typescript' ? '.ts' : '.js');
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
    const names = [];
    for (const node of parsed.statements) {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) continue;
      if (!ts.isFunctionDeclaration(node) || !node.name || node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword)) {
        throw new Error(name + ': Only named functions and type declarations are supported in global scripts.');
      }
      if (node.body && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) names.push(node.name.text);
    }
    if (!names.length) throw new Error(name + ': Add at least one named export function.');
    const emitted = ts.transpileModule(source, {fileName: file, reportDiagnostics: true,
      compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}});
    if (emitted.diagnostics?.length) {
      throw new Error(name + ': ' + ts.flattenDiagnosticMessageText(emitted.diagnostics[0].messageText, '\n'));
    }
    return {id, file, name, source, code: emitted.outputText};
  });
}

export function libraryPrelude(libraries) {
  if (!libraries.length) return '';
  return 'const shared = Object.freeze({' + libraries.map(({id, code}) =>
    JSON.stringify('script_' + id) + ': (() => {\nconst exports = Object.create(null);\n' +
    code + '\nreturn Object.freeze(exports);\n})()').join(',\n') + '});\n';
}
