import { expect, test } from "vitest"
import { type MessageSurface } from "../../../contracts/integrations"
import { type JsonObject } from "../../../contracts/json"
import { createRuntime, runTool, runtimeContext } from "../../../test/runtime"

// send_reply's parts: checked against the surface's reply contract before
// anything is sent, so the model sees the contract's own message.

test("valid console parts pass through to the surface", async () => {
  const runtime = replyRuntime("console")
  const parts: JsonObject[] = [
    { kind: "reference", target: { kind: "table", id: "collections_1" } },
    { kind: "choices", options: [{ label: "Yes" }, { label: "No" }] },
  ]

  const result = await runTool({
    call: { args: { parts, text: "Done" }, id: "call_1", name: "send_reply" },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({ status: "sent" })
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    parts,
    runId: "run_1",
    text: "Done",
  })
})

test("an empty parts list sends as no parts", async () => {
  const runtime = replyRuntime("console")

  await runTool({
    call: {
      args: { parts: [], text: "Done" },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    parts: undefined,
    runId: "run_1",
    text: "Done",
  })
})

test("a malformed part fails the call with the contract's message", async () => {
  const runtime = replyRuntime("console")

  const result = await runTool({
    call: {
      args: {
        parts: [{ kind: "reference", target: { kind: "page", id: "x" } }],
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "parts.0: does not match any allowed shape" },
    status: "error",
  })
  expect(runtime.platform.sendReply).not.toHaveBeenCalled()
  expect(runtime.context.activeSurface?.communicated).toBe(false)
})

test("a surface that admits no parts rejects any", async () => {
  const runtime = replyRuntime("slack")

  const result = await runTool({
    call: {
      args: {
        parts: [{ kind: "choices", options: [{ label: "Yes" }] }],
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "parts are not available on Slack" },
    status: "error",
  })
  expect(runtime.platform.sendReply).not.toHaveBeenCalled()
})

function replyRuntime(surface: MessageSurface) {
  return createRuntime({
    context: runtimeContext({
      activeSurface: { communicated: false, surface, target: null },
      tools: [
        {
          access: "write",
          description: "Send reply.",
          inputSchema: {},
          name: "send_reply",
          route: "surface",
        },
      ],
    }),
  })
}
