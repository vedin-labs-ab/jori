import { runtimeAssets } from "../../../runtime/_generated/assets"
import {
  codexHome,
  codexVersion,
  e2bSandboxTemplate,
  sandboxNodeVersion,
  traceFile,
  tracePort,
  workspace,
} from "./config"
import { createImageCheckCommand as createSandboxImageCheckCommand } from "./image"

export {
  codexHome,
  codexVersion,
  e2bSandboxTemplate,
  sandboxNodeVersion,
  traceFile,
  tracePort,
  workspace,
}

export const artifactSandboxDependencies = runtimeAssets.artifact.dependencies

export function createImageCheckCommand() {
  return createSandboxImageCheckCommand({
    codexVersion,
    imageCheck: runtimeAssets.sandbox.imageCheck,
    workspace,
  })
}

export function createBootstrapCommand() {
  return [
    "set -eu",
    "node --experimental-strip-types /tmp/milo-bootstrap.ts",
  ].join("\n")
}

export function createCodexCommand() {
  return [
    "set -euo pipefail",
    `codex exec --json --ephemeral --disable apps --skip-git-repo-check --sandbox workspace-write - < /tmp/milo-prompt.md | tee "${traceFile}"`,
  ].join("\n")
}

export function createTraceServerCommand() {
  return [
    "set -eu",
    `touch "${traceFile}"`,
    `export MILO_TRACE_FILE="${traceFile}"`,
    `export MILO_TRACE_PORT="${tracePort}"`,
    "exec node --experimental-strip-types /tmp/milo-trace-server.ts",
  ].join("\n")
}
