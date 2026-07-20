import { expect, test, vi } from "vitest"
import { sandboxWorkspace } from "../../../contracts/runtime/sandbox"
import { type RuntimeId } from "../../../contracts/runtime/worker"
import { type ToolRuntime } from "../runtime"
import { materializeSandboxResult } from "./materialize"

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
      drained: null,
      handoffs: { approvals: [], offers: [] },
      prompt: {
        context: "context",
        instructions: "system",
        organization: null,
        place: null,
        person: null,
        requester: null,
      },
      run: {
        id: "run_1" as RuntimeId<"runs">,
        rootId: null,
        sandboxId: null,
        status: "running",
        organizationId: "organization",
      },
      result: null,
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
