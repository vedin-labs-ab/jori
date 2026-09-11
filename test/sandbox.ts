import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach } from "vitest"
import { sandboxWorkspace } from "../contracts/coding"
import { sandboxClonePath } from "../convex/runtime/sandbox/path"
import {
  type SandboxCloneRepositoryInput,
  type SandboxCommandHandle,
  type SandboxCommandInput,
  type SandboxCommandResult,
  type SandboxRuntime,
  type SandboxWriteFile,
} from "../convex/runtime/sandbox/types"

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true })
  }
})

/** The coding tools against a real filesystem: every command and path the
 *  sandbox would see is mapped into a temporary workspace instead. */
export function createLocalSandbox(
  files: Record<string, string>,
  parksCommands = false
) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "jori-tools-"))
  roots.push(root)

  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }

  return new LocalSandbox(root, parksCommands)
}

export function createGitSandbox() {
  const sandbox = createLocalSandbox({ "file.txt": "hello\n" })

  runGit(sandbox.root, "init")
  runGit(sandbox.root, "config", "user.email", "jori@example.com")
  runGit(sandbox.root, "config", "user.name", "Jori")
  runGit(sandbox.root, "add", "file.txt")
  runGit(sandbox.root, "commit", "-m", "initial")

  return sandbox
}

function runGit(cwd: string, ...args: string[]) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })

  if (result.status !== 0) {
    throw new Error(result.stderr)
  }
}

class LocalSandbox implements SandboxRuntime {
  async exportFile(): Promise<never> {
    throw new Error("Local sandbox tests do not access Convex storage.")
  }

  async importFile() {
    throw new Error("Local sandbox tests do not access Convex storage.")
  }

  // What a slow shell looks like to the tool layer: the result is held back
  // until it is collected, the way a real one is until its callback lands.
  private held: SandboxCommandResult | null = null

  constructor(
    readonly root: string,
    private readonly parksCommands = false
  ) {}

  async runCommand(input: SandboxCommandInput) {
    const result = spawnSync("bash", ["-lc", this.mapCommand(input.command)], {
      cwd: this.mapPath(input.cwd ?? sandboxWorkspace),
      encoding: "utf8",
      timeout: input.timeoutMs,
    })

    return {
      exitCode: result.status ?? 1,
      stderr: result.stderr,
      stdout: result.stdout,
    }
  }

  async startCommand(input: SandboxCommandInput) {
    const result = await this.runCommand(input)

    if (!this.parksCommands) {
      return result
    }

    this.held = result

    return { pid: "4321", token: "command-token" }
  }

  async finishCommand(
    _handle: SandboxCommandHandle,
    options: { kill: boolean }
  ) {
    const held = this.held

    this.held = null

    return held === null || options.kill
      ? { exitCode: 124, stderr: "", stdout: "", timedOut: true as const }
      : held
  }

  async readFile(pathValue: string) {
    return fs.readFileSync(this.mapPath(pathValue))
  }

  async writeFiles(files: SandboxWriteFile[]) {
    for (const file of files) {
      const target = this.mapPath(file.path)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, file.content)
    }
  }

  async cloneRepository(input: SandboxCloneRepositoryInput) {
    return {
      directory: sandboxClonePath({
        repository: input.repository,
        value: input.directory,
      }),
      git: true as const,
      remoteUrl: input.remoteUrl,
      repository: input.repository,
    }
  }

  private mapCommand(command: string) {
    return command.replaceAll(sandboxWorkspace, this.root)
  }

  private mapPath(pathValue: string) {
    return pathValue.startsWith(sandboxWorkspace)
      ? pathValue.replace(sandboxWorkspace, this.root)
      : pathValue
  }
}
