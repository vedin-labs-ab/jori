import { expect, test, vi } from "vitest"
import { createSurfaceRuntime, runTool } from "../../../test/runtime"

test("send_reply can finish the run after a successful final reply", async () => {
  const runtime = createSurfaceRuntime()

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
  const runtime = createSurfaceRuntime()
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
  const runtime = createSurfaceRuntime()

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
  const runtime = createSurfaceRuntime({ tool: "add_reaction" })

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
