import { expect, test, vi } from "vitest"
import { materializeSandboxResult } from "./attachments"
import { sandboxWorkspace } from "./sandbox/artifacts"
import { type ToolRuntime } from "./tool"
import { type ConvexId } from "./types"

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

  expect(runtime.convex.fetchGitHubCloneCredentials).toHaveBeenCalledWith({
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

function cloneRuntime(): ToolRuntime {
  return {
    convex: {
      fetchGitHubCloneCredentials: vi.fn(async () => ({
        remoteUrl: "https://github.com/acme/app.git",
        token: "secret-token",
        username: "x-access-token",
      })),
    } as unknown as ToolRuntime["convex"],
    context: {
      activeSurface: null,
      prompt: "system",
      run: {
        id: "run_1" as ConvexId<"runs">,
        rootId: null,
        sandboxId: null,
        status: "running",
        tenantId: "tenant",
      },
      session: null,
      tools: [],
    },
    sandbox: {
      cloneRepository: vi.fn(async (input) => ({
        directory: input.directory ?? `${sandboxWorkspace}/app`,
        git: true,
        ref: input.ref,
        remoteUrl: input.remoteUrl,
        repository: input.repository,
      })),
    } as unknown as ToolRuntime["sandbox"],
  }
}
