import { expect, test } from "vitest"
import { createSurfaceRuntime, runTool } from "../../../test/runtime"

test.each([
  false,
  true,
])("send_reply delivers the message and communicates with final=%s", async (final) => {
  const runtime = createSurfaceRuntime()
  const blocks = [{ text: { text: "Done", type: "mrkdwn" }, type: "section" }]

  const result = await runTool({
    call: {
      args: final ? { final, text: "Done" } : { blocks, text: "Done" },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(result.finished).toBe(final)
  expect(JSON.parse(result.content)).toEqual({ status: "sent" })
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: final ? undefined : blocks,
    runId: "run_1",
    text: "Done",
  })
})

test("send_reply forwards the active Linear target by default", async () => {
  const runtime = createSurfaceRuntime({
    surface: "linear",
    target: "linear:thread:comment-id",
  })

  await runTool({
    call: {
      args: { text: "Done" },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    target: "linear:thread:comment-id",
    text: "Done",
  })
})

test("send_reply can target a specific Linear comment", async () => {
  const runtime = createSurfaceRuntime({
    surface: "linear",
    target: "linear:thread:old-comment-id",
  })

  await runTool({
    call: {
      args: { commentId: "new-comment-id", text: "Comment-level update" },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: undefined,
    runId: "run_1",
    target: "linear:thread:new-comment-id",
    text: "Comment-level update",
  })
  expect(runtime.context.activeSurface?.target).toBe(
    "linear:thread:new-comment-id"
  )
})

test.each([
  false,
  true,
])("add_reaction delivers the reaction and communicates with final=%s", async (final) => {
  const runtime = createSurfaceRuntime({ tool: "add_reaction" })

  const result = await runTool({
    call: {
      args: {
        ...(final ? { final } : {}),
        reaction: "white_check_mark",
        target: { messageTs: "123.456" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
  })

  expect(result.finished).toBe(final)
  expect(JSON.parse(result.content)).toEqual({ status: "added" })
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.platform.addReaction).toHaveBeenCalledWith({
    reaction: "white_check_mark",
    runId: "run_1",
    target: { messageTs: "123.456" },
  })
})

test("add_reaction is refused on the console surface", async () => {
  const runtime = createSurfaceRuntime({
    surface: "console",
    tool: "add_reaction",
  })

  const result = await runTool({
    call: {
      args: { reaction: "+1", target: { messageTs: "123.456" } },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message: "Reactions are not available in the console." },
    status: "error",
  })
  expect(runtime.platform.addReaction).not.toHaveBeenCalled()
  expect(runtime.context.activeSurface?.communicated).toBe(false)
})

test.each([
  {
    reason: "invalid target",
    reaction: "+1",
    target: { commentId: "123", type: "comment" },
    message: "target.commentId must be a positive integer",
  },
  {
    reason: "unsupported reaction",
    reaction: "thumbsup",
    target: { commentId: 123, type: "comment" },
    message:
      "reaction must be one of +1, -1, laugh, confused, heart, hooray, rocket, eyes",
  },
])("add_reaction rejects $reason before calling Convex", async ({
  reaction,
  target,
  message,
}) => {
  const runtime = createSurfaceRuntime({
    surface: "github",
    tool: "add_reaction",
  })
  const result = await runTool({
    call: {
      args: { reaction, target },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: { message },
    status: "error",
  })
  expect(runtime.platform.addReaction).not.toHaveBeenCalled()
})
