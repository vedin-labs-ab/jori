import { type CommandResult } from "e2b"

export type CommandTrace = {
  exitCode: number
  stdout: string
  stderr: string
  error?: string
}

export class CodexRunError extends Error {
  trace: string | undefined

  constructor(message: string, trace?: string) {
    super(message)
    this.name = "CodexRunError"
    this.trace = trace
  }
}

export type SetupTrace = {
  type: "milo.setup"
  stage: string
  trace: CommandTrace
}

export function recordSetupTrace(
  traces: SetupTrace[],
  stage: string,
  trace: CommandTrace
) {
  traces.push({ type: "milo.setup", stage, trace })

  return trace
}

export function assertSetupCommandSucceeded(
  commandTrace: CommandTrace,
  message: string,
  setupTraces: SetupTrace[]
) {
  assertCommandSucceeded(
    commandTrace,
    message,
    serializeSetupTrace(setupTraces)
  )
}

function serializeSetupTrace(traces: SetupTrace[]) {
  return traces.map((trace) => JSON.stringify(trace)).join("\n")
}

export function createCommandTrace(result: CommandResult): CommandTrace {
  return {
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    ...(result.error === undefined ? {} : { error: result.error }),
  }
}

export function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function assertCommandSucceeded(
  commandTrace: CommandTrace,
  message: string,
  trace?: string
) {
  if (commandTrace.exitCode !== 0) {
    throw new CodexRunError(formatCommandError(message, commandTrace), trace)
  }
}

export function assertCommandsSucceeded(
  commandTraces: CommandTrace[],
  message: string
) {
  for (const commandTrace of commandTraces) {
    assertCommandSucceeded(commandTrace, message)
  }
}

function formatCommandError(message: string, commandTrace: CommandTrace) {
  const details = [
    `exitCode=${commandTrace.exitCode}`,
    commandTrace.error === undefined
      ? undefined
      : `error=${commandTrace.error}`,
    summarizeOutput("stderr", commandTrace.stderr),
    summarizeOutput("stdout", commandTrace.stdout),
  ].filter((detail) => detail !== undefined)

  return details.length === 0 ? message : `${message} ${details.join(" ")}`
}

function summarizeOutput(label: string, output: string) {
  const value = output.trim()

  if (value === "") {
    return undefined
  }

  const maxLength = 1_000
  const summary =
    value.length <= maxLength ? value : `...${value.slice(-maxLength)}`

  return `${label}=${JSON.stringify(summary)}`
}
