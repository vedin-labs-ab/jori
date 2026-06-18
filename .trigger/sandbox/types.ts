export type SandboxCommandInput = {
  command: string
  cwd?: string
  timeoutMs?: number
}

export type SandboxCommandResult = {
  exitCode: number
  stderr: string
  stdout: string
}

export type SandboxRuntime = {
  cleanup(): Promise<void>
  runCommand(input: SandboxCommandInput): Promise<SandboxCommandResult>
}
