import { expect, test } from "vitest"
import { createSurfaceRuntime, runTool } from "../../../test/runtime"

test("send_reply routes through Convex and marks the active surface communicated", async () => {
  const runtime = createSurfaceRuntime()

  const result = await runTool({
    call: {
      args: {
        blocks: [{ text: { text: "Done", type: "mrkdwn" }, type: "section" }],
        text: "Done",
      },
      id: "call_1",
      name: "send_reply",
    },
    runtime,
  })

  expect(result.finished).toBe(false)
  expect(JSON.parse(result.content)).toEqual({ status: "sent" })
  expect(runtime.context.activeSurface?.communicated).toBe(true)
  expect(runtime.platform.sendReply).toHaveBeenCalledWith({
    blocks: [{ text: { text: "Done", type: "mrkdwn" }, type: "section" }],
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

test("add_reaction routes through Convex and marks the active surface communicated", async () => {
  const runtime = createSurfaceRuntime({ tool: "add_reaction" })

  const result = await runTool({
    call: {
      args: {
        reaction: "white_check_mark",
        target: { messageTs: "123.456" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
  })

  expect(result.finished).toBe(false)
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

test("add_reaction validates GitHub reaction targets before calling Convex", async () => {
  const runtime = createSurfaceRuntime({
    surface: "github",
    tool: "add_reaction",
  })

  const result = await runTool({
    call: {
      args: {
        reaction: "+1",
        target: { commentId: "123", type: "comment" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: {
      message: "target.commentId must be a positive integer",
    },
    status: "error",
  })
  expect(runtime.platform.addReaction).not.toHaveBeenCalled()
})

test("add_reaction validates GitHub reaction values before calling Convex", async () => {
  const runtime = createSurfaceRuntime({
    surface: "github",
    tool: "add_reaction",
  })

  const result = await runTool({
    call: {
      args: {
        reaction: "thumbsup",
        target: { commentId: 123, type: "comment" },
      },
      id: "call_1",
      name: "add_reaction",
    },
    runtime,
  })

  expect(JSON.parse(result.content)).toEqual({
    error: {
      message:
        "reaction must be one of +1, -1, laugh, confused, heart, hooray, rocket, eyes",
    },
    status: "error",
  })
  expect(runtime.platform.addReaction).not.toHaveBeenCalled()
})
