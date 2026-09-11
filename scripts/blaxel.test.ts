import { execFileSync } from "node:child_process"
import { expect, test } from "vitest"

test("sandbox connection can be loaded by the image tooling without Convex", () => {
  const moduleUrl = new URL(
    "../convex/runtime/sandbox/blaxel/connection.ts",
    import.meta.url
  ).href
  expect(() =>
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        `await import(${JSON.stringify(moduleUrl)})`,
      ],
      { stdio: "pipe" }
    )
  ).not.toThrow()
})
