import { spawnSync } from "node:child_process"
import { afterEach, expect, test, vi } from "vitest"
import { deploymentVariable, requireDeploymentVariable } from "./remote.ts"

vi.mock("node:child_process", () => ({ spawnSync: vi.fn() }))
afterEach(() => vi.clearAllMocks())

const env = { CONVEX_DEPLOYMENT: "dev:isolated-example" }

function output(stdout: string, status = 0) {
  vi.mocked(spawnSync).mockReturnValue({
    pid: 1,
    output: [null, stdout, "sensitive diagnostic"],
    stdout,
    stderr: "sensitive diagnostic",
    signal: null,
    status,
  })
}

test("provider settings come from the selected deployment through a private pipe", () => {
  output("  project-key\n")
  expect(requireDeploymentVariable("E2B_API_KEY", env)).toBe("project-key")
  expect(spawnSync).toHaveBeenCalledWith(
    expect.any(String),
    ["convex", "env", "get", "E2B_API_KEY"],
    { encoding: "utf8", env, stdio: ["ignore", "pipe", "pipe"] }
  )
})

test("missing settings never fall back to a local provider account", () => {
  output("")
  expect(deploymentVariable("E2B_DOMAIN", env)).toBeUndefined()
  expect(() => requireDeploymentVariable("E2B_API_KEY", env)).toThrow(
    "Missing E2B_API_KEY"
  )
})

test("failed reads omit provider output and require an explicit target", () => {
  output("secret", 1)
  expect(() => deploymentVariable("E2B_API_KEY", env)).toThrow(
    "Could not read E2B_API_KEY from the selected deployment"
  )
  expect(() => deploymentVariable("E2B_API_KEY", {})).toThrow(
    "Choose an explicit Convex deployment"
  )
})
