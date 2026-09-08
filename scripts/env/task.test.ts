import { readFileSync } from "node:fs"
import { expect, test } from "vitest"
import { taskCommand } from "./tasks"

test("binds a task to a target and forwards what follows", () => {
  expect(taskCommand(["skills", "prod-eu"])).toEqual({
    command: ["npx", "convex", "run", "skills/catalog:syncGlobalSkills"],
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
    target: "dev",
  })
})

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
    ["db:seed", "seed"],
    ["db:truncate", "truncate"],
  ]) {
    expect(scripts[name]).toBe(
      `node --experimental-strip-types scripts/env/task.ts ${task}`
    )
  }
})
