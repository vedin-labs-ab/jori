import { execFileSync } from "node:child_process"
import fs from "node:fs"
import { builtinModules } from "node:module"
import os from "node:os"
import path from "node:path"
import { listFiles } from "./files.ts"
import { root, sourceRoot } from "./paths.ts"
import { type RuntimeAssets } from "./types.ts"

export function validateRuntimeSources(runtimeAssets: RuntimeAssets) {
  validateJsonSources()
  validateAppShell(runtimeAssets.app.shell.html)
  validateAppBuilder(runtimeAssets.app.builder)
  validateAppTemplate(runtimeAssets.app.template)
}

function validateAppBuilder(builder: Record<string, string>) {
  const entryPath = "jori-app-builder.ts"
  const entry = builder[entryPath]

  if (entry === undefined) {
    throw new Error(`App builder is missing ${entryPath}.`)
  }

  const paths = new Set(Object.keys(builder))
  const missing = Object.entries(builder).flatMap(([sourcePath, source]) =>
    collectStaticImportSpecifiers(source).flatMap((specifier) => {
      if (!specifier.startsWith(".")) {
        return []
      }

      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(sourcePath), specifier)
      )

      return paths.has(target) ? [] : [`${sourcePath} -> ${target}`]
    })
  )

  if (missing.length > 0) {
    throw new Error(`App builder imports missing files: ${missing.join(", ")}`)
  }
}

function collectStaticImportSpecifiers(content: string) {
  return [
    ...content.matchAll(
      /^\s*import(?:\s+type)?(?:\s+[\s\S]*?\s+from)?\s*["']([^"']+)["']/gm
    ),
    ...content.matchAll(
      /^\s*export(?:\s+type)?\s+(?:\*|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']/gm
    ),
  ].map((match) => match[1])
}

function validateJsonSources() {
  for (const filePath of listFiles(sourceRoot)) {
    if (path.extname(filePath) === ".json") {
      JSON.parse(fs.readFileSync(filePath, "utf8"))
    }
  }
}

function validateAppShell(html: string) {
  for (const placeholder of [
    "__JORI_APP_TITLE__",
    "__JORI_APP_STYLE__",
    "__JORI_APP_CONFIG__",
    "__JORI_APP_LOADER__",
  ]) {
    if (!html.includes(placeholder)) {
      throw new Error(`App shell is missing ${placeholder}.`)
    }
  }

  if (!html.trimStart().startsWith("<!doctype html>")) {
    throw new Error("App shell must be a complete HTML document.")
  }
}

function validateAppTemplate(template: Record<string, string>) {
  for (const requiredPath of [
    "package.json",
    "index.html",
    "tsconfig.json",
    "biome.json",
    "vite.config.ts",
    "src/main.tsx",
    "src/jori.css",
    "src/vite-env.d.ts",
    "src/components/ui/button.tsx",
    "src/lib/utils.ts",
  ]) {
    if (template[requiredPath] === undefined) {
      throw new Error(`App template is missing ${requiredPath}.`)
    }
  }

  validateAppTemplateDependencies(template)
  validateAppTemplateBuild(template)
}

function validateAppTemplateDependencies(template: Record<string, string>) {
  const packageNames = new Set(
    Object.keys(readAppPackageDependencies(template))
  )
  const imports = collectExternalImports(template)
  const missing = [...imports].filter(
    (specifier) => !packageNames.has(specifier)
  )

  if (missing.length > 0) {
    throw new Error(
      `App template package.json is missing dependencies: ${missing.join(", ")}`
    )
  }
}

export function readAppPackageDependencies(template: Record<string, string>) {
  const content = template["package.json"]

  if (content === undefined) {
    throw new Error("App template is missing package.json.")
  }

  const packageJson = JSON.parse(content) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }
}

function collectExternalImports(template: Record<string, string>) {
  const imports = new Set<string>()

  for (const [filePath, content] of Object.entries(template)) {
    if (!/\.(css|ts|tsx)$/.test(filePath)) {
      continue
    }

    for (const specifier of collectImportSpecifiers(content)) {
      const packageName = externalPackageName(specifier)

      if (packageName !== null) {
        imports.add(packageName)
      }
    }
  }

  return imports
}

function collectImportSpecifiers(content: string) {
  return [
    ...content.matchAll(
      /\bfrom\s+["']([^"']+)["']|\bimport\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|@import\s+(?:url\()?["']([^"']+)["']/g
    ),
  ].flatMap((match) => match.slice(1).filter((value) => value !== undefined))
}

function externalPackageName(specifier: string) {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("@/") ||
    specifier.startsWith("node:")
  ) {
    return null
  }

  const [first, second] = specifier.split("/")
  const packageName = first.startsWith("@") ? `${first}/${second}` : first

  return builtinModules.includes(packageName) ? null : packageName
}

function validateAppTemplateBuild(template: Record<string, string>) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "jori-template-"))
  const fixtureSourcePaths = ["src/App.tsx", "src/styles.css"]

  try {
    writeTemplateFixture(project, template)
    fs.symlinkSync(
      path.join(root, "node_modules"),
      path.join(project, "node_modules")
    )
    runAppTemplateCommand(project, "biome", ["format", "--write", "src"])
    runAppTemplateCommand(project, "tsc", ["-p", "tsconfig.json", "--noEmit"])
    runAppTemplateCommand(project, "biome", ["ci", ...fixtureSourcePaths])
    runAppTemplateCommand(project, "vite", [
      "build",
      "--config",
      "vite.config.ts",
    ])
  } finally {
    fs.rmSync(project, { force: true, recursive: true })
  }
}

function runAppTemplateCommand(
  project: string,
  command: string,
  args: string[]
) {
  execFileSync(path.join(root, "node_modules/.bin", command), args, {
    cwd: project,
    stdio: "pipe",
  })
}

function writeTemplateFixture(
  project: string,
  template: Record<string, string>
) {
  for (const [filePath, content] of Object.entries(template)) {
    const target = path.join(project, filePath)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }

  fs.writeFileSync(
    path.join(project, "src/App.tsx"),
    [
      'import { Button } from "@/components/ui/button"',
      'import { Card, CardContent } from "@/components/ui/card"',
      "",
      "export default function App() {",
      "  return <Card><CardContent><Button>Ready</Button></CardContent></Card>",
      "}",
      "",
    ].join("\n")
  )
}
