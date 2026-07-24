import {
  sandboxAppRuntime,
  sandboxInternalRoot,
  sandboxWorkspace,
} from "../../contracts/runtime/sandbox"
import { runtimeAssets } from "../../runtime/apps/_generated/assets"
import { shellQuote } from "./path"
import { type SandboxWriteFile } from "./types"

const appBuilderConfigPath = `${sandboxAppRuntime}/.milo/app-builder.json`
export const appTemplatePath = `${sandboxInternalRoot}/apps/template`
const appRunnerPath = `${sandboxAppRuntime}/.milo/build-app.mjs`

export function appRuntimeFiles(): SandboxWriteFile[] {
  return [
    ...Object.entries(runtimeAssets.app.builder).map(([filePath, content]) => ({
      content,
      path: `${sandboxAppRuntime}/${filePath}`,
    })),
    {
      content: `${JSON.stringify(createAppBuilderConfig(), null, 2)}\n`,
      path: appBuilderConfigPath,
    },
    ...Object.entries(runtimeAssets.app.template).map(
      ([filePath, content]) => ({
        content,
        path: `${appTemplatePath}/${filePath}`,
      })
    ),
    {
      content: createAppRunnerScript(),
      path: appRunnerPath,
    },
  ]
}

export function appBuildCommand(workspacePath: string) {
  return [
    `MILO_WORKSPACE=${shellQuote(sandboxAppRuntime)}`,
    `MILO_APP_BUILDER_CONFIG=${shellQuote(appBuilderConfigPath)}`,
    "node",
    "--experimental-strip-types",
    shellQuote(appRunnerPath),
    shellQuote(workspacePath),
  ].join(" ")
}

function createAppBuilderConfig() {
  return { appTemplatePath }
}

function createAppRunnerScript() {
  return `
import fs from "node:fs/promises"
import path from "node:path"
import { checkAppWorkspace } from "../milo-app-builder.ts"

const workspace = ${JSON.stringify(sandboxWorkspace)}
const inputPath = process.argv[2]

if (inputPath === undefined || inputPath.trim() === "") {
  throw new Error("workspacePath is required")
}

const workspacePath = await resolveWorkspacePath(inputPath)
const app = await checkAppWorkspace(workspacePath)
process.stdout.write(JSON.stringify(app))

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
