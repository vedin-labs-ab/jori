import { expect, test, vi } from "vitest"
import { runtimeContext, runtimeId } from "../../test/trigger"
import { type AgentRuntime } from "../runtime"
import { sandboxWorkspace } from "../sandbox/workspace"
import { executeToolCall } from "../tool"

test("prompted GitHub commit tools include collected workspace changes", async () => {
  const runtime = createRuntime()

  const { content } = await executeToolCall({
    attempt: 1,
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
    sequence: 100,
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

function createRuntime(): AgentRuntime {
  return {
    platform: {
      callTool: vi.fn(),
      recordEvent: vi.fn(),
      requestApproval: vi.fn(async () => ({
        approvalId: runtimeId<"approvals">("approval_1"),
        code: "ABC123",
        instruction: "Approval requested.",
        status: "approval_requested",
      })),
    } as unknown as AgentRuntime["platform"],
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
    sandbox: {
      runCommand: vi.fn(async () => ({
        exitCode: 0,
        stderr: "",
        stdout: JSON.stringify({
          files: [
            {
              content: "website\n",
              operation: "upsert",
              path: "PRODUCT.md",
            },
          ],
          headSha: "a".repeat(40),
        }),
      })),
    } as unknown as AgentRuntime["sandbox"],
  }
}
