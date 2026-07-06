import {
  artifactEntrypoint,
  platformArtifactSourcePathPrefixes,
  platformArtifactSourcePaths,
  requiredArtifactSourcePaths,
} from "../../contracts/artifacts/source"
import {
  sandboxArtifactRuntime,
  sandboxInternalRoot,
  sandboxWorkspace,
} from "../../contracts/runtime"
import { runtimeAssets } from "../../convex/runtime/_generated/assets"
import { type SandboxWriteFile } from "./types"

export { sandboxArtifactRuntime, sandboxWorkspace }

const artifactBuilderConfigPath = `${sandboxArtifactRuntime}/.milo/artifact-builder.json`
export const artifactTemplatePath = `${sandboxInternalRoot}/artifacts/template`
const artifactRunnerPath = `${sandboxArtifactRuntime}/.milo/build-artifact.mjs`

export function artifactRuntimeFiles(): SandboxWriteFile[] {
  return [
    ...Object.entries(runtimeAssets.artifact.builder).map(
      ([filePath, content]) => ({
        content,
        path: `${sandboxArtifactRuntime}/${filePath}`,
      })
    ),
    {
      content: `${JSON.stringify(createArtifactBuilderConfig(), null, 2)}\n`,
      path: artifactBuilderConfigPath,
    },
    ...Object.entries(runtimeAssets.artifact.template).map(
      ([filePath, content]) => ({
        content,
        path: `${artifactTemplatePath}/${filePath}`,
      })
    ),
  ]
}

export function artifactBuildCommand(workspacePath: string) {
  return [
    `MILO_WORKSPACE=${shellQuote(sandboxArtifactRuntime)}`,
    `MILO_ARTIFACT_BUILDER_CONFIG=${shellQuote(artifactBuilderConfigPath)}`,
    "node",
    "--experimental-strip-types",
    shellQuote(artifactRunnerPath),
    shellQuote(workspacePath),
  ].join(" ")
}

export function artifactRunnerFile(): SandboxWriteFile {
  return {
    content: createArtifactRunnerScript(),
    path: artifactRunnerPath,
  }
}

function createArtifactBuilderConfig() {
  return {
    artifactEntrypoint,
    artifactTemplatePath,
    platformArtifactSourcePathPrefixes,
    platformArtifactSourcePaths,
    requiredArtifactSourcePaths,
  }
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function createArtifactRunnerScript() {
  return `
import fs from "node:fs/promises"
import path from "node:path"
import { checkArtifactWorkspace } from "../milo-artifact-builder.ts"

const workspace = ${JSON.stringify(sandboxWorkspace)}
const inputPath = process.argv[2]

if (inputPath === undefined || inputPath.trim() === "") {
  throw new Error("workspacePath is required")
}

const workspacePath = await resolveWorkspacePath(inputPath)
const artifact = await checkArtifactWorkspace(workspacePath)
process.stdout.write(JSON.stringify(artifact))

async function resolveWorkspacePath(value) {
  const candidate = path.isAbsolute(value)
    ? path.resolve(value)
    : path.resolve(workspace, value)
  const [workspaceRoot, resolved] = await Promise.all([
    realPathOrResolved(workspace),
    fs.realpath(candidate),
  ])
  const relative = path.relative(workspaceRoot, resolved)

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("workspacePath must be inside the Milo workspace")
  }

  return resolved
}

async function realPathOrResolved(value) {
  return await fs.realpath(value).catch(() => path.resolve(value))
}
`.trimStart()
}
