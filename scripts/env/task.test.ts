import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect, test } from "vitest"
import { taskCommand } from "./tasks"

test("binds a task to a target and forwards what follows", () => {
  expect(taskCommand(["skills", "prod-eu"])).toEqual({
    command: ["npx", "convex", "run", "skills/catalog:syncGlobalSkills"],
    primary: true,
    target: "prod-eu",
  })
  expect(taskCommand(["seed", "dev", "--organization", "org"])).toEqual({
    command: [
      "node",
      "--experimental-strip-types",
      "scripts/db/seed.ts",
      "--organization",
      "org",
    ],
    primary: false,
    target: "dev",
  })
})

test.each(["onboarding", "seed", "truncate"])(
  "rejects production %s before loading any environment",
  (task) => {
    for (const target of ["prod-us", "prod-eu"]) {
      expect(() => taskCommand([task, target])).toThrow(
        "only runs against the dev target"
      )
    }
  }
)

test.each(["--help", "--dry-run", "unexpected"])(
  "rejects ignored sandbox argument %s before building an image",
  (argument) => {
    expect(() => taskCommand(["sandbox", "dev", argument])).toThrow(
      "Usage: pnpm sandbox"
    )
  }
)

test.each(["skills", "sandbox"])(
  "rejects shared %s deployment from a worktree before loading any environment",
  (task) => {
    const directory = mkdtempSync(path.join(tmpdir(), "jori-task-guard-"))
    const worktree = path.join(directory, "task")
    const script = fileURLToPath(new URL("./task.ts", import.meta.url))
    const git = (args: string[]) =>
      execFileSync("git", args, { cwd: directory, stdio: "pipe" })
    try {
      git(["init"])
      git([
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "--allow-empty",
        "-m",
        "Initial commit",
      ])
      git(["worktree", "add", "-b", "task", worktree])
      const result = spawnSync(
        process.execPath,
        ["--experimental-strip-types", script, task, "prod-us"],
        { cwd: worktree, encoding: "utf8" }
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toContain("runs from the primary checkout")
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }
)

test.each(
  [
    [],
    ["unknown", "dev"],
    ["sandbox"],
    ["sandbox", "staging"],
    ["sandbox", "prod"],
    ["sandbox", "--env", "dev"],
  ].map((args) => [args])
)("rejects a missing task or target: %j", (args) => {
  expect(() => taskCommand(args)).toThrow("Usage:")
})

test("package scripts take the target as their only argument", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>
  }
  for (const [name, task] of [
    ["sandbox", "sandbox"],
    ["skills", "skills"],
    ["db:onboarding", "onboarding"],
    ["db:seed", "seed"],
    ["db:truncate", "truncate"],
  ]) {
    expect(scripts[name]).toBe(
      `node --experimental-strip-types scripts/env/task.ts ${task}`
    )
  }
})
