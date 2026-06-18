import { execFile } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import {
  commandTimeoutMs,
  maxCommandBuffer,
  maxDiagnosticChars,
  maxDiagnosticLines,
  nodeModulesPath,
} from "./config.ts"

const run = promisify(execFile)

export async function formatArtifactSource(
  project: string,
  sourcePaths: string[]
) {
  await runCommand(binary("biome"), ["format", "--write", ...sourcePaths], {
    cwd: project,
    label: "format",
  })
}

export async function runArtifactChecks(
  project: string,
  sourcePaths: string[]
) {
  const tsconfigPath = await writeTypeScriptConfig(project, sourcePaths)
  await runCommand(
    binary("tsc"),
    ["-p", tsconfigPath, "--noEmit", "--pretty", "false"],
    {
      cwd: project,
      label: "TypeScript",
    }
  )
  await runCommand(binary("biome"), ["ci", ...sourcePaths], {
    cwd: project,
    label: "Biome",
  })
  await runCommand(binary("vite"), ["build", "--config", "vite.config.ts"], {
    cwd: project,
    label: "build",
  })
}

async function writeTypeScriptConfig(project: string, sourcePaths: string[]) {
  const configPath = path.join(project, "tsconfig.artifact.json")
  const files = typecheckSourcePaths(sourcePaths)
  await fs.writeFile(
    configPath,
    `${JSON.stringify({ extends: "./tsconfig.json", files }, null, 2)}\n`
  )

  return configPath
}

function typecheckSourcePaths(sourcePaths: string[]) {
  return [...new Set(["src/main.tsx", ...sourcePaths.filter(isTypeScriptPath)])]
}

function isTypeScriptPath(sourcePath: string) {
  return /\.(ts|tsx)$/.test(sourcePath)
}

async function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; label: string }
) {
  try {
    await run(command, args, {
      cwd: options.cwd,
      maxBuffer: maxCommandBuffer,
      timeout: commandTimeoutMs,
    })
  } catch (error) {
    const output = compactCommandOutput(error)
    const suffix = output === "" ? "." : `:\n${output}`
    throw new Error(`Artifact ${options.label} check failed${suffix}`)
  }
}

function compactCommandOutput(error: unknown) {
  const streamOutput = [
    commandOutput(error, "stdout"),
    commandOutput(error, "stderr"),
  ]
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .join("\n")
    .replaceAll(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "")
    .trim()
  const output = streamOutput === "" ? commandMessage(error) : streamOutput

  if (output === "") {
    return ""
  }

  const lines = output.split("\n")
  const compacted = lines.slice(0, maxDiagnosticLines).join("\n")
  const suffix =
    lines.length > maxDiagnosticLines
      ? `\n...truncated ${lines.length - maxDiagnosticLines} lines`
      : ""

  return (compacted + suffix).slice(0, maxDiagnosticChars)
}

function commandMessage(error: unknown) {
  return error instanceof Error ? error.message.trim() : ""
}

function commandOutput(error: unknown, key: "stdout" | "stderr") {
  return typeof error === "object" && error !== null && key in error
    ? (error as Record<typeof key, unknown>)[key]
    : undefined
}

function binary(name: string) {
  return path.join(nodeModulesPath, ".bin", name)
}
