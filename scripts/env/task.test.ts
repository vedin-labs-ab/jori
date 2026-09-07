import { readFileSync } from "node:fs"
import { expect, test } from "vitest"
import { taskArguments } from "./tasks"

test.each([
  "sandbox",
  "skills",
])("%s development remains unregionalized", (task) => {
  const args = taskArguments([task, "--env", "dev"])
  expect(args.slice(0, 5)).toEqual([
    "--experimental-strip-types",
    "scripts/env/index.ts",
    "--env",
    "dev",
    "--",
  ])
})

test.each([
  ["sandbox", "eu"],
  ["sandbox", "us"],
  ["skills", "eu"],
  ["skills", "us"],
])("%s production %s puts region before the command separator", (task, region) => {
  const args = taskArguments([task, "--env", "prod", "--region", region])
  expect(args.slice(0, 7)).toEqual([
    "--experimental-strip-types",
    "scripts/env/index.ts",
    "--env",
    "prod",
    "--region",
    region,
    "--",
  ])
  expect(args.slice(7)).not.toContain("--region")
})

test.each(
  [
    [],
    ["unknown", "--env", "dev"],
    ["sandbox", "--env", "staging"],
    ["sandbox", "--env", "prod"],
    ["sandbox", "--env", "prod", "--region", "invalid"],
    ["sandbox", "--env", "prod", "--region", "eu", "--region", "us"],
    ["sandbox", "--env", "dev", "--region", "eu"],
    ["sandbox", "--env", "prod", "--", "--region", "eu"],
  ].map((args) => [args])
)("rejects ambiguous targets and forwarded commands: %j", (args) => {
  expect(() => taskArguments(args)).toThrow("Usage:")
})

test("package commands allow ordinary pnpm region arguments", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>
  }
  for (const [name, task] of [
    ["sandbox:build", "sandbox"],
    ["skills:sync", "skills"],
  ]) {
    for (const environment of ["dev", "prod"]) {
      expect(scripts[`${name}:${environment}`]).toBe(
        `node --experimental-strip-types scripts/env/task.ts ${task} --env ${environment}`
      )
    }
  }
})
