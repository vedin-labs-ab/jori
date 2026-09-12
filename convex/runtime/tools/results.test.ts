import { expect, test, vi } from "vitest"
import { sandboxWorkspace } from "../../../contracts/coding"
import { createRuntime } from "../../../test/runtime"
import { type AgentRuntime } from "../platform/types"
import { type SandboxRuntime } from "../sandbox/types"
import { materializeSandboxResult } from "./results"

test("materializes GitHub clone descriptors as Git working copies", async () => {
  const runtime = cloneRuntime()

  await expect(
    materializeSandboxResult(runtime, {
      clone: {
        kind: "github_repository",
        owner: "acme",
        ref: "main",
        repo: "app",
      },
    })
  ).resolves.toEqual({
    directory: `${sandboxWorkspace}/app`,
    git: true,
    ref: "main",
    remoteUrl: "https://github.com/acme/app.git",
    repository: "acme/app",
  })

  expect(runtime.platform.fetchGitHubCloneCredentials).toHaveBeenCalledWith({
    owner: "acme",
    repo: "app",
    runId: "run_1",
  })
  expect(runtime.sandbox.cloneRepository).toHaveBeenCalledWith({
    directory: undefined,
    ref: "main",
    remoteUrl: "https://github.com/acme/app.git",
    repository: "acme/app",
    token: "secret-token",
    username: "x-access-token",
  })
})

function cloneRuntime(): AgentRuntime {
  return createRuntime({
    sandbox: {
      cloneRepository: vi.fn(async (input) => ({
        directory: input.directory ?? `${sandboxWorkspace}/app`,
        git: true,
        ref: input.ref,
        remoteUrl: input.remoteUrl,
        repository: input.repository,
      })),
    } as unknown as SandboxRuntime,
  })
}
