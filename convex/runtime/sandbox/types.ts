import { type RuntimeId } from "../../../contracts/runtime/ids"

export type SandboxCommandInput = {
  command: string
  cwd?: string
  timeoutMs?: number
}

export type SandboxCommandResult = {
  exitCode: number
  stderr: string
  stdout: string
  timedOut?: true
}

/** A command still running in the sandbox: the pid to kill it by, and the
 *  secret its wrapper posts back with once it finishes. */
export type SandboxCommandHandle = {
  pid: number
  token: string
}

export type SandboxCloneRepositoryInput = {
  directory?: string | null
  ref?: string
  remoteUrl: string
  repository: string
  token: string
  username: string
}

export type SandboxCloneResult = {
  directory: string
  git: true
  ref?: string
  remoteUrl: string
  repository: string
}

export type SandboxWriteFile = {
  content: string | Uint8Array
  path: string
}

export type SandboxRuntime = {
  importFile(input: { fileId: RuntimeId<"files">; path: string }): Promise<void>
  cloneRepository(
    input: SandboxCloneRepositoryInput
  ): Promise<SandboxCloneResult>
  finishCommand(
    handle: SandboxCommandHandle,
    options: { kill: boolean }
  ): Promise<SandboxCommandResult>
  readFile(path: string): Promise<Uint8Array>
  runCommand(input: SandboxCommandInput): Promise<SandboxCommandResult>
  startCommand(
    input: SandboxCommandInput
  ): Promise<SandboxCommandResult | SandboxCommandHandle>
  writeFiles(files: SandboxWriteFile[]): Promise<void>
}
