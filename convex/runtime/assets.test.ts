import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { expect, test } from "vitest"
import { runtimeAssets } from "./_generated/assets"

const root = path.resolve(import.meta.dirname, "../..")
const sourceRoot = path.join(root, "runtime/source")
const appSourceRoot = path.join(root, "src")

test("generated runtime output is fresh", () => {
  expect(() =>
    execFileSync(
      "node",
      ["--experimental-strip-types", "scripts/runtime.ts", "--check"],
      { cwd: root, stdio: "pipe" }
    )
  ).not.toThrow()
}, 45_000)

test("derives executable payloads from checked TypeScript source files", () => {
  expect(runtimeAssets.mcp.milo).toContain("./milo-artifact-builder.ts")
  expect(runtimeAssets.mcp.milo).not.toContain("type ToolDefinition")
  expect(runtimeAssets.mcp.broker).toContain("milo-github-")
  expect(runtimeAssets.artifact.builder["milo-artifact-builder.ts"]).toContain(
    "./.milo/builder/config.ts"
  )
  expect(runtimeAssets.artifact.builder[".milo/builder/config.ts"]).toContain(
    "artifact-builder.json"
  )
  expect(runtimeAssets.artifact.fonts.geistLatinWoff2).not.toBe("")
  expect(runtimeAssets.sandbox.bootstrap).toContain("CODEX_HOME")
  expect(runtimeAssets.sandbox.bootstrap).not.toContain(
    "CODEX_AUTH_JSON_BASE64"
  )
  expect(runtimeAssets.sandbox.bootstrap).not.toContain(
    "MILO_SANDBOX_FILES_BASE64"
  )
})

test("keeps artifact shell code and markup in native source assets", () => {
  expect(runtimeAssets.artifact.shell.html).toBe(
    readSource("artifact/shell/index.html")
  )
  expect(runtimeAssets.artifact.shell.style).toBe(
    [
      extractDesignTokenCss(readAppSource("styles.css")),
      readSource("artifact/shell/style.css"),
    ].join("\n\n")
  )
  expect(runtimeAssets.artifact.shell.loader).toContain(
    "Artifact shell config is missing"
  )
  expect(runtimeAssets.artifact.shell.loader).toContain("milo-runtime=1")
  expect(runtimeAssets.artifact.shell.loader).not.toContain(
    "type ArtifactShellConfig"
  )
})

test("generates the artifact UI kit from Milo source", () => {
  expect(runtimeAssets.artifact.template["src/components/ui/button.tsx"]).toBe(
    readAppSource("components/ui/button.tsx")
  )
  expect(runtimeAssets.artifact.template["src/components/ui/dialog.tsx"]).toBe(
    readAppSource("components/ui/dialog.tsx")
  )
  expect(runtimeAssets.artifact.template["src/lib/utils.ts"]).toBe(
    readAppSource("lib/utils.ts")
  )
  expect(runtimeAssets.artifact.template["src/milo.ts"]).toContain("MiloClient")
  expect(runtimeAssets.artifact.template["src/milo.css"]).toContain(
    '@import "tailwindcss";'
  )
  expect(runtimeAssets.artifact.template["src/milo.css"]).not.toContain(
    "@clerk/ui"
  )
  expect(artifactBiomeConfig().css?.parser?.tailwindDirectives).toBe(true)
})

test("keeps the artifact SDK barrel safe for contract extraction", async () => {
  await expect(
    import("../../runtime/source/artifact/template/src/milo")
  ).resolves.toHaveProperty("defineArtifactContract")
})

test("generates artifact sandbox dependencies from template package manifest", () => {
  expect(runtimeAssets.artifact.dependencies).toEqual(
    artifactPackageInstallDependencies()
  )
  expect(runtimeAssets.artifact.dependencies).toContain("@biomejs/biome@2.4.12")
  expect(artifactPackageScripts().check).toBe(
    "node --experimental-strip-types ../../milo-artifact-builder.ts check ."
  )
})

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), "utf8")
}

function readAppSource(relativePath: string) {
  return fs.readFileSync(path.join(appSourceRoot, relativePath), "utf8")
}

function artifactPackageInstallDependencies() {
  const packageJson = artifactPackageJson()

  return Object.entries({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  })
    .map(([name, version]) => `${name}@${version}`)
    .sort((left, right) => left.localeCompare(right))
}

function artifactPackageScripts() {
  return artifactPackageJson().scripts ?? {}
}

function artifactPackageJson() {
  return JSON.parse(runtimeAssets.artifact.template["package.json"]) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    scripts?: Record<string, string>
  }
}

function artifactBiomeConfig() {
  return JSON.parse(runtimeAssets.artifact.template["biome.json"]) as {
    css?: { parser?: { tailwindDirectives?: boolean } }
  }
}

function extractDesignTokenCss(source: string) {
  const blocks = source.match(/(?:^|\n)(?::root|\.dark)\s\{[\s\S]*?\n\}/g)

  if (blocks === null) {
    throw new Error("Missing design tokens.")
  }

  return blocks.map((block) => block.trim()).join("\n\n")
}
