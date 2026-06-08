import { type CommandResult } from "e2b"

export type StoredRuntimeTrace = {
  harness: {
    install?: StoredCommandTrace
    bootstrap?: StoredCommandTrace
    preflights?: StoredCommandTrace[]
    agent?: StoredCommandTrace
    runtime?: StoredErrorTrace
  }
  agent?: {
    jsonl: string
  }
}

export type StoredCommandTrace = {
  exitCode: number
  stdout: string
  stderr: string
  error?: string
}

type StoredErrorTrace = {
  error: string
}

export class CodexRunError extends Error {
  trace: StoredRuntimeTrace

  constructor(message: string, trace: StoredRuntimeTrace) {
    super(message)
    this.name = "CodexRunError"
    this.trace = trace
  }
}

export function createCommandTrace(result: CommandResult): StoredCommandTrace {
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
  commandTrace: StoredCommandTrace,
  message: string,
  trace: StoredRuntimeTrace
) {
  if (commandTrace.exitCode !== 0) {
    throw new CodexRunError(message, trace)
  }
}

export function assertCommandsSucceeded(
  commandTraces: StoredCommandTrace[],
  message: string,
  trace: StoredRuntimeTrace
) {
  for (const commandTrace of commandTraces) {
    assertCommandSucceeded(commandTrace, message, trace)
  }
}
