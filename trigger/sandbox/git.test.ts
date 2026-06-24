import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, expect, test } from "vitest"
import { sandboxWorkspace } from "./artifacts"
import { executeCodingTool } from "./coding"
import { sandboxClonePath } from "./path"
import {
  type SandboxCloneRepositoryInput,
  type SandboxCommandInput,
  type SandboxRuntime,
  type SandboxWriteFile,
} from "./types"

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true })
  }
})

test("surfaces bash git guard failures through pipelines", async () => {
  const result = await executeCodingTool({
    input: {
      command:
        "git clone https://github.com/vedin-labs-ab/milo.git 2>&1 | tail -20",
    },
    sandbox: createLocalSandbox(),
    tool: "bash",
  })

  expect(result).toMatchObject({
    exitCode: 2,
    stderr: "",
    stdout: expect.stringContaining("git is read-only in bash"),
  })
})

function createLocalSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "milo-git-tools-"))
  roots.push(root)

  return new LocalSandbox(root)
}

class LocalSandbox implements SandboxRuntime {
  constructor(readonly root: string) {}

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

  async cleanup() {}

  async buildArtifact() {
    return {}
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
