import { type JsonObject } from "../../contracts/json"

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

export type SandboxExtractTarballInput = {
  bytes: Uint8Array
  directory?: string | null
  repository: string
}

export type SandboxWriteFile = {
  content: string | Uint8Array
  path: string
}

export type SandboxRuntime = {
  buildArtifact(workspacePath: string): Promise<JsonObject>
  cleanup(): Promise<void>
  extractTarball(
    input: SandboxExtractTarballInput
  ): Promise<{ directory: string; repository: string }>
  readFile(path: string): Promise<Uint8Array>
  runCommand(input: SandboxCommandInput): Promise<SandboxCommandResult>
  writeFiles(files: SandboxWriteFile[]): Promise<void>
}
