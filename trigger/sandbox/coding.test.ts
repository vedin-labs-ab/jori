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

test("reads a bounded line range from a workspace file", async () => {
  const sandbox = createLocalSandbox({
    "src/app.ts": ["one", "two", "three"].join("\n"),
  })

  await expect(
    executeCodingTool({
      input: { path: "src/app.ts", offset: 2, limit: 1 },
      sandbox,
      tool: "read",
    })
  ).resolves.toMatchObject({
    content: "2: two\n",
    endLine: 2,
    path: "src/app.ts",
    startLine: 2,
    truncated: true,
  })
})

test("searches and discovers workspace files with bounds", async () => {
  const sandbox = createLocalSandbox({
    "src/a.ts": "alpha\n",
    "src/b.ts": "alpha\n",
    "src/c.md": "alpha\n",
  })
  const grep = await executeCodingTool({
    input: { pattern: "alpha", include: "src/**/*.ts", limit: 1 },
    sandbox,
    tool: "grep",
  })

  expect(grep).toMatchObject({
    matches: [{ line: "alpha", lineNumber: 1 }],
    truncated: true,
  })
  await expect(
    executeCodingTool({
      input: { pattern: "src/**/*.ts" },
      sandbox,
      tool: "glob",
    })
  ).resolves.toMatchObject({
    paths: ["src/a.ts", "src/b.ts"],
    truncated: false,
  })
})

test("applies patches inside the workspace and rejects escaping paths", async () => {
  const sandbox = createLocalSandbox({})
  await executeCodingTool({
    input: {
      patch: [
        "--- /dev/null",
        "+++ b/src/new.txt",
        "@@ -0,0 +1 @@",
        "+hello",
      ].join("\n"),
    },
    sandbox,
    tool: "apply_patch",
  })

  expect(fs.readFileSync(path.join(sandbox.root, "src/new.txt"), "utf8")).toBe(
    "hello\n"
  )
  await expect(
    executeCodingTool({
      input: { patch: "--- /dev/null\n+++ b/../escape.txt\n@@ -0,0 +1 @@\n+x" },
      sandbox,
      tool: "apply_patch",
    })
  ).rejects.toThrow("escapes the Milo workspace")
})

test("applies patches from an explicit workspace cwd", async () => {
  const sandbox = createLocalSandbox({ "repo/src/file.txt": "old\n" })

  await executeCodingTool({
    input: {
      cwd: "repo",
      patch: [
        "--- a/src/file.txt",
        "+++ b/src/file.txt",
        "@@ -1 +1 @@",
        "-old",
        "+new",
      ].join("\n"),
    },
    sandbox,
    tool: "apply_patch",
  })

  expect(
    fs.readFileSync(path.join(sandbox.root, "repo/src/file.txt"), "utf8")
  ).toBe("new\n")
})

test("runs bash from a workspace cwd and rejects outside cwd values", async () => {
  const sandbox = createLocalSandbox({ "src/file.txt": "ok" })

  await expect(
    executeCodingTool({
      input: { command: "pwd && cat file.txt", cwd: "src" },
      sandbox,
      tool: "bash",
    })
  ).resolves.toMatchObject({
    exitCode: 0,
    stderr: "",
    stdout: `${fs.realpathSync(path.join(sandbox.root, "src"))}\nok`,
  })
  await expect(
    executeCodingTool({
      input: { command: "pwd", cwd: "/tmp" },
      sandbox,
      tool: "bash",
    })
  ).rejects.toThrow("Sandbox path must be inside the Milo workspace")
})

test("runs read-only git commands against a real repository", async () => {
  await expect(
    executeCodingTool({
      input: { args: ["log", "--oneline", "-1"] },
      sandbox: createGitSandbox(),
      tool: "git",
    })
  ).resolves.toMatchObject({
    exitCode: 0,
    stderr: "",
    stdout: expect.stringContaining("initial"),
  })
})

test("rejects mutating git commands in the git tool", async () => {
  await expect(
    executeCodingTool({
      input: { args: ["checkout", "-b", "work"] },
      sandbox: createGitSandbox(),
      tool: "git",
    })
  ).rejects.toThrow("git checkout is not allowed")
})

test("guards git writes inside bash commands", async () => {
  const sandbox = createGitSandbox()

  await expect(
    executeCodingTool({
      input: { command: "git status --short && command git checkout -b work" },
      sandbox,
      tool: "bash",
    })
  ).resolves.toMatchObject({
    exitCode: 2,
    stderr: expect.stringContaining("git is read-only in bash"),
  })
})

function createLocalSandbox(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "milo-tools-"))
  roots.push(root)
  fs.mkdirSync(root, { recursive: true })

  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }

  return new LocalSandbox(root)
}

function createGitSandbox() {
  const sandbox = createLocalSandbox({ "file.txt": "hello\n" })
  runGit(sandbox.root, "init")
  runGit(sandbox.root, "config", "user.email", "milo@example.com")
  runGit(sandbox.root, "config", "user.name", "Milo")
  runGit(sandbox.root, "add", "file.txt")
  runGit(sandbox.root, "commit", "-m", "initial")

  return sandbox
}

function runGit(cwd: string, ...args: string[]) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  })

  if (result.status !== 0) {
    throw new Error(result.stderr)
  }
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
