import { expect, test, vi } from "vitest"
import { sandboxWorkspace } from "../../contracts/runtime/sandbox"
import { executeToolCall, type ToolRuntime } from "../tool"
import { type ConvexId } from "../types"

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
  expect(runtime.convex.requestApproval).toHaveBeenCalledWith({
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

function createRuntime(): ToolRuntime {
  return {
    convex: {
      callTool: vi.fn(),
      recordEvent: vi.fn(),
      requestApproval: vi.fn(async () => ({
        approvalId: id<"approvals">("approval_1"),
        code: "ABC123",
        instruction: "Approval requested.",
        status: "approval_requested",
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
        id: id<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        tenantId: "tenant",
      },
      session: null,
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
    },
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
    } as unknown as ToolRuntime["sandbox"],
  }
}

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
