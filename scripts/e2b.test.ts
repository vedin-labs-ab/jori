import { spawnSync } from "node:child_process"
import { expect, test } from "vitest"

test("template connection resolves in the Node runtime used by build commands", () => {
  const moduleUrl = new URL(
    "../convex/runtime/sandbox/e2b/connection.ts",
    import.meta.url
  ).href
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--input-type=module",
      "-e",
      `const { sandboxEndpoint } = await import(${JSON.stringify(moduleUrl)}); if (sandboxEndpoint().apiUrl !== "https://api.e2b.app") process.exitCode = 1;`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  )
  expect(result.stderr).toBe("")
  expect(result.status).toBe(0)
})
