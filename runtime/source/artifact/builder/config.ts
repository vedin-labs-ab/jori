import fs from "node:fs/promises"
import path from "node:path"
import { type BuilderConfig } from "./types.ts"

export const workspace =
  process.env.MILO_WORKSPACE ?? "/home/user/.milo/artifacts/runtime"
export const nodeModulesPath = path.join(workspace, "node_modules")
export const maxArtifactFiles = 120
export const maxArtifactFileBytes = 512 * 1024
export const maxArtifactTreeBytes = 2 * 1024 * 1024
export const maxCommandBuffer = 1024 * 1024 * 4
export const commandTimeoutMs = 120_000
export const maxDiagnosticChars = 12_000
export const maxDiagnosticLines = 80

export const config = await readBuilderConfig()
export const platformSourcePaths = new Set(config.platformArtifactSourcePaths)
export const platformSourcePathPrefixes =
  config.platformArtifactSourcePathPrefixes

async function readBuilderConfig(): Promise<BuilderConfig> {
  const configPath =
    process.env.MILO_ARTIFACT_BUILDER_CONFIG ??
    path.join(workspace, ".milo", "artifact-builder.json")
  const content = await fs.readFile(configPath, "utf8")

  return JSON.parse(content) as BuilderConfig
}
