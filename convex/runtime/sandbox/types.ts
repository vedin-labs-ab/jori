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

export type SandboxCloneRepositoryInput = {
  directory?: string | null
  ref?: string
  remoteUrl: string
  repository: string
  token: string
  username: string
}

export type SandboxWriteFile = {
  content: string | Uint8Array
  path: string
}

export type SandboxRuntime = {
  cleanup(): Promise<void>
  cloneRepository(input: SandboxCloneRepositoryInput): Promise<{
    directory: string
    git: true
    ref?: string
    remoteUrl: string
    repository: string
  }>
  readFile(path: string): Promise<Uint8Array>
  runCommand(input: SandboxCommandInput): Promise<SandboxCommandResult>
  writeFiles(files: SandboxWriteFile[]): Promise<void>
}
