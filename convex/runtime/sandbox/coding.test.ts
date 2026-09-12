import fs from "node:fs"
import path from "node:path"
import { expect, test } from "vitest"
import { createGitSandbox, createLocalSandbox } from "../../../test/sandbox"
import { executeCodingTool, finishBash, isParkedCommand } from "./coding"
import { type SandboxRuntime } from "./types"

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

test.each(["audit", "audit/note.txt"])(
  "matches grep filters relative to the selected search path %s",
  async (searchPath) => {
    const sandbox = createLocalSandbox({
      "audit/note.txt": "audit line\n",
      "other/note.txt": "outside line\n",
    })

    await expect(
      executeCodingTool({
        input: { path: searchPath, pattern: "audit", include: "note.txt" },
        sandbox,
        tool: "grep",
      })
    ).resolves.toMatchObject({
      matches: [{ path: "audit/note.txt", lineNumber: 1, line: "audit line" }],
      truncated: false,
    })
  }
)

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
  ).rejects.toThrow("escapes the Jori workspace")
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
  ).rejects.toThrow("Sandbox path must be inside the Jori workspace")
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
  await expect(
    executeCodingTool({
      input: { command: "git status --short && command git checkout -b work" },
      sandbox: createGitSandbox(),
      tool: "bash",
    })
  ).resolves.toMatchObject({
    exitCode: 2,
    stderr: expect.stringContaining("git is read-only in bash"),
  })

  await expect(
    executeCodingTool({
      input: { command: "git clone example 2>&1 | tail -20" },
      sandbox: createLocalSandbox({}),
      tool: "bash",
    })
  ).resolves.toMatchObject({
    exitCode: 2,
    stdout: expect.stringContaining("git is read-only in bash"),
  })
})

test("parks a slow bash command and collects it on the wake", async () => {
  const sandbox = createLocalSandbox({ "src/file.txt": "ok" }, true)

  await expect(
    finishBash(sandbox, await parkBash(sandbox, "cat src/file.txt"), {
      kill: false,
    })
  ).resolves.toMatchObject({ exitCode: 0, stdout: "ok" })
  // A killed command never wrote its exit code, so it reads as a timeout.
  await expect(
    finishBash(sandbox, await parkBash(sandbox, "true"), { kill: true })
  ).resolves.toMatchObject({ exitCode: 124 })
})

async function parkBash(sandbox: SandboxRuntime, command: string) {
  const outcome = await executeCodingTool({
    input: { command },
    sandbox,
    tool: "bash",
  })

  if (!isParkedCommand(outcome)) {
    throw new Error("Expected the command to park.")
  }

  return outcome.parked
}
