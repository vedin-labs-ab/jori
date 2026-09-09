import { expect, test, vi } from "vitest"
import { createSurfaceRuntime, runTool } from "../../../test/runtime"

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
