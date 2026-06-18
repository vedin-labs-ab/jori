import path from "node:path"
import * as ts from "typescript"
import { root, sourceRoot } from "./paths.ts"

const tsHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => root,
  getNewLine: () => "\n",
}

export function transpileTypeScript(source: string, relativePath: string) {
  const result = ts.transpileModule(source, {
    fileName: path.join(sourceRoot, relativePath),
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    reportDiagnostics: true,
  })

  const errors =
    result.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    ) ?? []

  if (errors.length > 0) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, tsHost))
  }

  return result.outputText
}
