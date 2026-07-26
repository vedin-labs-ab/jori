import fs from "node:fs/promises"
import path from "node:path"

type BuilderConfig = {
  appTemplatePath: string
}

const workspace = process.env.JORI_WORKSPACE ?? "/home/user/.jori/apps/runtime"
export const nodeModulesPath = path.join(workspace, "node_modules")
export const maxCommandBuffer = 1024 * 1024 * 4
export const commandTimeoutMs = 120_000
export const maxDiagnosticChars = 12_000
export const maxDiagnosticLines = 80

export const config = await readBuilderConfig()

async function readBuilderConfig(): Promise<BuilderConfig> {
  const configPath =
    process.env.JORI_APP_BUILDER_CONFIG ??
    path.join(workspace, ".jori", "app-builder.json")
  const content = await fs.readFile(configPath, "utf8")

  return JSON.parse(content) as BuilderConfig
}
