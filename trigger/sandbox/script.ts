import { sandboxWorkspace } from "./artifacts"
import { compactFailure } from "./output"
import { shellQuote } from "./path"
import { type SandboxRuntime } from "./types"

export async function runJsonScript(args: {
  input: Record<string, unknown>
  sandbox: SandboxRuntime
  script: string
  timeoutMs?: number
}) {
  const result = await args.sandbox.runCommand({
    command: scriptCommand(args.script, args.input),
    cwd: sandboxWorkspace,
    timeoutMs: args.timeoutMs,
  })

  if (result.exitCode !== 0) {
    throw new Error(compactFailure(result))
  }

  return parseResult(result.stdout)
}

function scriptCommand(script: string, input: Record<string, unknown>) {
  return [
    `export MILO_TOOL_INPUT=${shellQuote(JSON.stringify(input))}`,
    "node --input-type=module <<'MILO_TOOL_SCRIPT'",
    script,
    "MILO_TOOL_SCRIPT",
  ].join("\n")
}

function parseResult(stdout: string) {
  const trimmed = stdout.trim()

  if (trimmed === "") {
    throw new Error("Sandbox tool returned no result.")
  }

  return JSON.parse(trimmed) as unknown
}
