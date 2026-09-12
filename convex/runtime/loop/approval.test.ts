// @vitest-environment edge-runtime
import { afterEach, expect, test, vi } from "vitest"
import { approvalFixture } from "../../../test/approvals"
import { createPlatform } from "../../../test/platform"
import {
  createQueuedModel,
  createRuntime,
  runLoop,
  runtimeContext,
} from "../../../test/runtime"
import { internal } from "../../_generated/api"
import * as jori from "../../broker/jori"
import { executeRunApproval } from "../tools/broker"

afterEach(() => vi.restoreAllMocks())

test.each(["allowed", "blocked"] as const)(
  "a persisted approved-action result is visible to the next model turn (%s)",
  async (mode) => {
    const { t, args, ctx, personId } = await approvalFixture()
    vi.spyOn(jori, "callJoriTool").mockResolvedValue({
      status: "read",
      text: "Synthetic result",
    })
    await t.run(
      async (db) =>
        await db.db.insert("permissions", {
          organizationId: "verification",
          tool: "read_file",
          mode,
          updatedBy: personId,
          updatedAt: Date.now(),
        })
    )
    const platform = convexPlatform({ t, args, ctx })
    const runtime = createRuntime({
      platform,
      context: runtimeContext({
        run: {
          id: args.runId,
          organizationId: "verification",
          status: "running",
          rootId: null,
          sandboxId: null,
        },
        tools: [
          {
            name: "finish_run",
            route: "run",
            access: "write",
            description: "Finish",
            inputSchema: {},
          },
        ],
      }),
    })
    const model = createQueuedModel([finish("first"), finish("second")])

    await expect(runLoop({ model, runtime })).resolves.toBe("completed")
    expect(model.complete).toHaveBeenCalledTimes(2)
    expect(model.complete.mock.calls[1]?.[0].messages).toContainEqual({
      role: "user",
      content: expect.stringContaining(
        mode === "blocked" ? "Tool is blocked: read_file" : "Synthetic result"
      ),
    })
    const notes = (await platform.listTranscript()).filter(
      (message) =>
        message.role === "user" && message.content?.includes("Approved action")
    )
    expect(notes).toHaveLength(1)
    expect(notes[0]?.content).not.toContain(" ran.")
    expect(
      (await t.run(async (db) => await db.db.get(args.approvalId)))?.consumedAt
    ).toBeDefined()
  }
)

function convexPlatform({
  t,
  args,
  ctx,
}: Omit<Awaited<ReturnType<typeof approvalFixture>>, "personId">) {
  const run = { runId: args.runId }
  const platform = Object.assign(createPlatform(), {
    executeApproval: () => executeRunApproval(ctx, args),
    loadRunHandoffs: () =>
      t.query(internal.runs.execution.waiters.handoffs.load, run),
    listTranscript: () =>
      t.query(internal.runs.execution.transcript.records.list, run),
    tailTranscript: () =>
      t.query(internal.runs.execution.transcript.records.tail, run),
  })
  platform.appendTranscript = async (messages) => {
    await t.mutation(internal.runs.execution.transcript.records.append, {
      ...run,
      messages,
    })
  }
  platform.markApprovalConsumed = async (consumption) => {
    await t.mutation(
      internal.runs.execution.waiters.handoffs.consumeApproval,
      consumption
    )
  }
  return platform
}

function finish(id: string) {
  return {
    type: "tool_calls" as const,
    content: null,
    toolCalls: [{ name: "finish_run", id, args: {} }],
  }
}
