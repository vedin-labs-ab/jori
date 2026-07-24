import fs from "node:fs"
import path from "node:path"
import { expect, test } from "vitest"
import { runtimeAssets } from "../../runtime/apps/_generated/assets"

const root = path.resolve(import.meta.dirname, "../..")
const sourceRoot = path.join(root, "runtime/apps")
const appSourceRoot = path.join(root, "src")

test("derives executable payloads from checked TypeScript source files", () => {
  expect(runtimeAssets.app.builder["milo-app-builder.ts"]).toContain(
    "./.milo/builder/config.ts"
  )
  expect(runtimeAssets.app.builder[".milo/builder/config.ts"]).toContain(
    "app-builder.json"
  )
  expect(runtimeAssets.app.fonts.geistLatinWoff2).not.toBe("")
})

test("keeps app shell code and markup in native source assets", () => {
  expect(runtimeAssets.app.shell.html).toBe(readSource("shell/index.html"))
  expect(runtimeAssets.app.shell.style).toBe(
    [
      extractDesignTokenCss(readAppSource("styles.css")),
      readSource("shell/style.css"),
    ].join("\n\n")
  )
  expect(runtimeAssets.app.shell.loader).toContain(
    "App shell config is missing"
  )
  expect(runtimeAssets.app.shell.loader).toContain("milo-runtime=1")
  expect(runtimeAssets.app.shell.loader).not.toContain("type AppShellConfig")
})

test("generates the app UI kit from Milo source", () => {
  expect(runtimeAssets.app.template["src/components/ui/button.tsx"]).toBe(
    readAppSource("components/ui/button.tsx")
  )
  expect(runtimeAssets.app.template["src/components/ui/dialog.tsx"]).toBe(
    readAppSource("components/ui/dialog.tsx")
  )
  expect(runtimeAssets.app.template["src/lib/utils.ts"]).toBe(
    readAppSource("lib/utils.ts")
  )
  expect(runtimeAssets.app.template["src/milo.ts"]).toContain("MiloClient")
  expect(runtimeAssets.app.template["src/milo.css"]).toContain(
    '@import "tailwindcss";'
  )
  expect(runtimeAssets.app.template["src/milo.css"]).not.toContain(
    "better-auth"
  )
  expect(appBiomeConfig().css?.parser?.tailwindDirectives).toBe(true)
})

test("keeps the app SDK barrel safe for contract extraction", async () => {
  await expect(
    import("../../runtime/apps/template/src/milo")
  ).resolves.toHaveProperty("defineAppContract")
})

test("generates app sandbox dependencies from template package manifest", () => {
  expect(runtimeAssets.app.dependencies).toEqual(
    appPackageInstallDependencies()
  )
  expect(runtimeAssets.app.dependencies).toContain("@biomejs/biome@2.4.12")
  expect(appPackageScripts().check).toBe(
    "node --experimental-strip-types /home/user/.milo/apps/runtime/milo-app-builder.ts check ."
  )
})

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(sourceRoot, relativePath), "utf8")
}

function readAppSource(relativePath: string) {
  return fs.readFileSync(path.join(appSourceRoot, relativePath), "utf8")
}

function appPackageInstallDependencies() {
  const packageJson = appPackageJson()

  return Object.entries({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  })
    .map(([name, version]) => `${name}@${version}`)
    .sort((left, right) => left.localeCompare(right))
}

function appPackageScripts() {
  return appPackageJson().scripts ?? {}
}

function appPackageJson() {
  return JSON.parse(runtimeAssets.app.template["package.json"]) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    scripts?: Record<string, string>
  }
}

function appBiomeConfig() {
  return JSON.parse(runtimeAssets.app.template["biome.json"]) as {
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
