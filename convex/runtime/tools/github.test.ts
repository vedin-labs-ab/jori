import { expect, test, vi } from "vitest"
import { sandboxWorkspace } from "../../../contracts/coding"
import { createRuntime, runTool, runtimeContext } from "../../../test/runtime"
import { type AgentRuntime } from "../platform/types"
import { type SandboxRuntime } from "../sandbox/types"

test("prompted GitHub commit tools include collected workspace changes", async () => {
  const runtime = commitRuntime()

  const { content } = await runTool({
    call: {
      args: {
        commitMessage: "Replace console references",
        owner: "acme",
        paths: ["PRODUCT.md"],
        pullNumber: 12,
        repo: "app",
      },
      id: "call_1",
      name: "github_commit_to_pull_request",
    },
    runtime,
  })

  expect(JSON.parse(content)).toMatchObject({ status: "approval_requested" })
  expect(runtime.sandbox.runCommand).toHaveBeenCalledWith({
    command: expect.stringContaining('"status"'),
    cwd: `${sandboxWorkspace}/app`,
    timeoutMs: 30_000,
  })
  expect(runtime.platform.requestApproval).toHaveBeenCalledWith({
    input: {
      changes: {
        files: [
          {
            content: "website\n",
            operation: "upsert",
            path: "PRODUCT.md",
          },
        ],
        headSha: "a".repeat(40),
      },
      commitMessage: "Replace console references",
      owner: "acme",
      paths: ["PRODUCT.md"],
      pullNumber: 12,
      repo: "app",
    },
    runId: "run_1",
    surface: "github",
    tool: "github_commit_to_pull_request",
  })
})

function commitRuntime(): AgentRuntime {
  return createRuntime({
    context: runtimeContext({
      tools: [
        {
          access: "write",
          description: "Commit to a GitHub pull request.",
          inputSchema: {},
          mode: "prompted",
          name: "github_commit_to_pull_request",
          route: "convex",
          surface: "github",
        },
      ],
    }),
    // The subject here is the input the tool prepares, so the sandbox only
    // has to answer with the changes the collection script would print.
    sandbox: {
      runCommand: vi.fn(async () => ({
        exitCode: 0,
        stderr: "",
        stdout: JSON.stringify({
          files: [
            { content: "website\n", operation: "upsert", path: "PRODUCT.md" },
          ],
          headSha: "a".repeat(40),
        }),
      })),
    } as unknown as SandboxRuntime,
  })
}
