import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { listFiles, normalizePath, sortRecord } from "./files.ts"
import {
  appSourcePath,
  appSourceRoot,
  contractsRoot,
  generatedPath,
  runtimeSourcePath,
  sourceRoot,
} from "./paths.ts"
import { transpileTypeScript } from "./transpile.ts"
import { type RuntimeAssets } from "./types.ts"
import { validateRuntimeSources } from "./validate.ts"

type GenerateOptions = {
  checkMode: boolean
}

const require = createRequire(import.meta.url)

export function generateRuntimeAssets({ checkMode }: GenerateOptions) {
  const assets = readRuntimeAssets()
  writeGeneratedFile(renderGeneratedModule(assets), checkMode)
  validateRuntimeSources(assets)
}

function readRuntimeAssets(): RuntimeAssets {
  const template = readTemplateFiles()

  return {
    artifact: {
      builder: readBuilderFiles(),
      dependencies: readArtifactDependencies(template),
      fonts: {
        geistLatinWoff2: readDependencyBase64(
          "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"
        ),
      },
      shell: {
        html: readSource("artifact/shell/index.html"),
        loader: readExecutableSource("artifact/shell/loader.ts"),
        style: readArtifactShellStyle(),
      },
      template,
    },
    mcp: {
      broker: readExecutableSource("mcp/broker.ts"),
      milo: readExecutableSource("mcp/milo.ts"),
      miloFiles: readMiloMcpFiles(),
    },
    sandbox: {
      bootstrap: readExecutableSource("sandbox/bootstrap.ts"),
      imageCheck: readExecutableSource("sandbox/image.ts"),
      slackPreflight: readExecutableSource("sandbox/preflight/slack.ts"),
      tokenPreflight: readExecutableSource("sandbox/preflight/token.ts"),
      traceServer: readExecutableSource("sandbox/trace.ts"),
    },
  }
}

function readMiloMcpFiles() {
  return {
    "milo/files.ts": readExecutableSource("mcp/files.ts"),
  }
}

function readSource(relativePath: string) {
  return fs.readFileSync(runtimeSourcePath(relativePath), "utf8")
}

function readAppSource(relativePath: string) {
  return fs.readFileSync(appSourcePath(relativePath), "utf8")
}

function readDependencyBase64(specifier: string) {
  return fs.readFileSync(require.resolve(specifier), "base64")
}

function readExecutableSource(relativePath: string) {
  const source = transpileTypeScript(readSource(relativePath), relativePath)

  return relativePath === "mcp/milo.ts"
    ? source
        .replaceAll(
          'from "../artifact/builder/index.ts"',
          'from "./milo-artifact-builder.ts"'
        )
        .replaceAll('from "./files.ts"', 'from "./milo/files.ts"')
    : source
}

function readTemplateFiles() {
  const templateRoot = path.join(sourceRoot, "artifact/template")
  const files: Record<string, string> = {}

  for (const filePath of listFiles(templateRoot)) {
    const sourcePath = normalizePath(path.relative(templateRoot, filePath))
    const relativePath = artifactTemplateOutputPath(sourcePath)
    files[relativePath] = fs.readFileSync(filePath, "utf8")
  }

  addArtifactPlatformFiles(files)

  return sortRecord(files)
}

function addArtifactPlatformFiles(files: Record<string, string>) {
  for (const filePath of listFiles(path.join(appSourceRoot, "components/ui"))) {
    const relativePath = normalizePath(path.relative(appSourceRoot, filePath))
    files[`src/${relativePath}`] = fs.readFileSync(filePath, "utf8")
  }

  for (const relativePath of ["hooks/use-mobile.ts", "lib/utils.ts"]) {
    files[`src/${relativePath}`] = readAppSource(relativePath)
  }

  files["src/milo.css"] = readArtifactThemeCss()
}

function readBuilderFiles() {
  const builderRoot = path.join(sourceRoot, "artifact/builder")
  const files: Record<string, string> = {}

  for (const filePath of listFiles(builderRoot)) {
    const sourcePath = normalizePath(path.relative(builderRoot, filePath))
    if (sourcePath === "types.ts") {
      continue
    }

    const outputPath =
      sourcePath === "index.ts"
        ? "milo-artifact-builder.ts"
        : `.milo/builder/${sourcePath}`
    const content = fs.readFileSync(filePath, "utf8")
    files[outputPath] =
      sourcePath === "index.ts"
        ? rewriteBuilderEntrypointImports(
            transpileTypeScript(content, `artifact/builder/${sourcePath}`)
          )
        : rewriteBuilderSharedImports(
            transpileTypeScript(content, `artifact/builder/${sourcePath}`)
          )
  }

  addBuilderContractFiles(files)

  return sortRecord(files)
}

function addBuilderContractFiles(files: Record<string, string>) {
  const artifactContractsRoot = path.join(contractsRoot, "artifacts")

  for (const filePath of listFiles(artifactContractsRoot)) {
    const sourcePath = normalizePath(
      path.relative(artifactContractsRoot, filePath)
    )

    if (sourcePath.endsWith(".test.ts")) {
      continue
    }

    const content = fs.readFileSync(filePath, "utf8")
    files[`.milo/builder/contracts/artifacts/${sourcePath}`] =
      rewriteGeneratedContractImports(
        transpileTypeScript(content, `contracts/artifacts/${sourcePath}`)
      )
  }
}

function writeGeneratedFile(content: string, checkMode: boolean) {
  if (checkMode) {
    const current = fs.existsSync(generatedPath)
      ? fs.readFileSync(generatedPath, "utf8")
      : ""

    if (current !== content) {
      throw new Error(
        "Runtime assets are stale. Run `pnpm runtime:generate` and commit the result."
      )
    }

    return
  }

  fs.mkdirSync(path.dirname(generatedPath), { recursive: true })
  fs.writeFileSync(generatedPath, content)
}

function renderGeneratedModule(runtimeAssets: RuntimeAssets) {
  return [
    "// Generated by scripts/runtime.ts. Do not edit by hand.",
    "\n",
    "export const runtimeAssets = ",
    JSON.stringify(runtimeAssets, null, 2),
    " as const",
    "",
  ].join("")
}

function artifactTemplateOutputPath(sourcePath: string) {
  return sourcePath === "biome.config.json" ? "biome.json" : sourcePath
}

function readArtifactDependencies(template: Record<string, string>) {
  const packageJson = parsePackageJson(template)
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  return Object.entries(dependencies)
    .map(([name, version]) => {
      if (!isExactPackageVersion(version)) {
        throw new Error(
          `Artifact template dependency ${name} must use an exact version.`
        )
      }

      return `${name}@${version}`
    })
    .sort((left, right) => left.localeCompare(right))
}

function parsePackageJson(template: Record<string, string>) {
  const content = template["package.json"]

  if (content === undefined) {
    throw new Error("Artifact template is missing package.json.")
  }

  return JSON.parse(content) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
}

function isExactPackageVersion(version: string) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)
}

function readArtifactThemeCss() {
  return readAppSource("styles.css")
    .split("\n")
    .filter((line) => !line.includes("@clerk/ui"))
    .join("\n")
}

function readArtifactShellStyle() {
  return [
    extractDesignTokenCss(readAppSource("styles.css")),
    readSource("artifact/shell/style.css"),
  ].join("\n\n")
}

function extractDesignTokenCss(source: string) {
  const blocks = source.match(/(?:^|\n)(?::root|\.dark)\s\{[\s\S]*?\n\}/g)

  if (blocks === null || blocks.length !== 2) {
    throw new Error("Milo style source must define :root and .dark tokens.")
  }

  return blocks.map((block) => block.trim()).join("\n\n")
}

function rewriteBuilderEntrypointImports(source: string) {
  return rewriteBuilderSharedImports(
    source.replaceAll(
      /from "\.\/([a-z-]+)\.ts"/g,
      'from "./.milo/builder/$1.ts"'
    )
  )
}

function rewriteBuilderSharedImports(source: string) {
  return source.replaceAll(
    'from "../../../../contracts/artifacts/',
    'from "./contracts/artifacts/'
  )
}

function rewriteGeneratedContractImports(source: string) {
  return source.replaceAll(/from "\.\/([a-z-]+)"/g, 'from "./$1.ts"')
}
