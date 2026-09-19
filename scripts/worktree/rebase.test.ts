import { writeFileSync } from "node:fs"
import path from "node:path"
import { expect, test } from "vitest"
import { createRepository } from "../fixtures"
import { rebaseTask } from "./rebase"

function fixture() {
  const repository = createRepository()
  const { directory, git } = repository
  git(["config", "user.name", "Test"])
  git(["config", "user.email", "test@example.com"])
  git(["config", "commit.gpgsign", "false"])
  const commit = (file: string, content: string, cwd = directory) => {
    writeFileSync(path.join(cwd, file), content)
    git(["-C", cwd, "add", file])
    git(["-C", cwd, "commit", "-m", `Update ${file}`])
  }
  commit("pnpm-lock.yaml", "initial lockfile\n")
  const task = path.join(directory, "task")
  git(["worktree", "add", "-b", "task/example", task])
  return { ...repository, task, commit }
}

test("a task merging another branch lands linearly even when main is already its ancestor", () => {
  const { directory, git, task, commit } = fixture()
  git(["checkout", "-b", "task/other"])
  commit("other.txt", "Other task content\n")
  git(["checkout", "main"])
  commit("own.txt", "Original task content\n", task)
  git(["-C", task, "merge", "--no-edit", "task/other"])
  const tree = git(["rev-parse", "task/example^{tree}"])
  const base = git(["rev-parse", "main"])
  expect(git(["merge-base", "main", "task/example"])).toBe(base)
  expect(git(["rev-list", "--merges", "main..task/example"])).not.toBe("")
  // A developer's preference must not reintroduce merge commits into main.
  git(["config", "rebase.rebaseMerges", "true"])

  expect(rebaseTask("task/example", task, directory)).toBe(false)
  git(["merge", "--ff-only", "task/example"])

  expect(git(["rev-list", "--merges", `${base}..main`])).toBe("")
  expect(git(["rev-parse", "main^{tree}"])).toBe(tree)
  expect(git(["show", "main:own.txt"])).toBe("Original task content")
  expect(git(["show", "main:other.txt"])).toBe("Other task content")
})

test("an already-current linear task keeps its commit and skips installation", () => {
  const { directory, git, task, commit } = fixture()
  commit("own.txt", "Task content\n", task)
  const head = git(["rev-parse", "task/example"])
  expect(rebaseTask("task/example", task, directory)).toBe(false)
  expect(git(["rev-parse", "task/example"])).toBe(head)
})

test("rebasing onto an updated lockfile requests installation before gating", () => {
  const { directory, git, task, commit } = fixture()
  commit("own.txt", "Task content\n", task)
  commit("pnpm-lock.yaml", "new lockfile from main\n")
  expect(rebaseTask("task/example", task, directory)).toBe(true)
  expect(git(["show", "task/example:pnpm-lock.yaml"])).toBe(
    "new lockfile from main"
  )
  expect(git(["show", "task/example:own.txt"])).toBe("Task content")
})

test("a conflicting rebase aborts and preserves the task's committed work", () => {
  const { directory, git, task, commit } = fixture()
  commit("pnpm-lock.yaml", "task lockfile\n", task)
  const head = git(["rev-parse", "task/example"])
  commit("pnpm-lock.yaml", "incompatible main lockfile\n")
  expect(() => rebaseTask("task/example", task, directory)).toThrow(
    "does not rebase cleanly"
  )
  expect(git(["rev-parse", "task/example"])).toBe(head)
  expect(git(["-C", task, "status", "--porcelain"])).toBe("")
  expect(git(["-C", task, "branch", "--show-current"])).toBe("task/example")
})
