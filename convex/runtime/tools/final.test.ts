import { expect, test, vi } from "vitest"
import { type RuntimeTool } from "../../../contracts/runtime/context"
import { createRuntime, runTool, runtimeContext } from "../../../test/runtime"
import { type AgentRuntime } from "../platform"

test("send_reply can finish the run after a successful final reply", async () => {
  const runtime = surfaceRuntime()

  const result = await runTool({
    call: {
      args: {
        final: true,
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(result.finished).toBe(true)
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    text: "Done",
  })
})

test("send_reply final does not finish when delivery fails", async () => {
  const runtime = surfaceRuntime()
  vi.mocked(runtime.platform.sendReply).mockRejectedValueOnce(
    new Error("Reply failed")
  )

  const result = await runTool({
    call: {
      args: {
        final: true,
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({
    error: { message: "Reply failed" },
    status: "error",
  })
  expect(runtime.context.activeSurface?.communicated).toBe(false)
})

test("send_reply rejects invalid final before sending", async () => {
  const runtime = surfaceRuntime()

  const result = await runTool({
    call: {
      args: {
        final: "true",
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "final must be a boolean" },
    status: "error",
  })
  expect(runtime.platform.sendReply).not.toHaveBeenCalled()
  expect(runtime.context.activeSurface?.communicated).toBe(false)
})

test("add_reaction can finish the run after a successful final reaction", async () => {
  const runtime = surfaceRuntime({ tools: [addReactionTool()] })

  const result = await runTool({
    call: {
      args: {
        final: true,
        reaction: "white_check_mark",
        target: { messageTs: "123.456" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
  })

  expect(result.finished).toBe(true)
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.platform.addReaction).toHaveBeenCalledWith({
    reaction: "white_check_mark",
    runId: "run_1",
    target: { messageTs: "123.456" },
  })
})

function surfaceRuntime(options: { tools?: RuntimeTool[] } = {}): AgentRuntime {
  return createRuntime({
    context: runtimeContext({
      activeSurface: {
        communicated: false,
        surface: "slack",
        target: null,
      },
      tools: options.tools ?? [sendReplyTool()],
    }),
  })
}

function sendReplyTool(): RuntimeTool {
  return {
    access: "write",
    description: "Send reply.",
    inputSchema: {},
    name: "send_reply",
    route: "surface",
  }
}

function addReactionTool(): RuntimeTool {
  return {
    access: "write",
    description: "Add reaction.",
    inputSchema: {},
    name: "add_reaction",
    route: "surface",
  }
}
