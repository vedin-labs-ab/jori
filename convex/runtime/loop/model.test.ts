import { expect, test } from "vitest"
import { createPlatform } from "../../../test/platform"
import {
  createQueuedModel,
  createRuntime,
  type QueuedModelResponse,
  runtimeContext,
  runtimePrompt,
} from "../../../test/runtime"
import { type ModelDelta, type ModelRuntime } from "../model/types"
import { runModelTurn } from "./model"

test("the model step starts blank, streams the reply, and leaves it for the act step", async () => {
  const platform = createPlatform()
  const runtime = createRuntime({ context: surface("console"), platform })
  const model = streamingModel(
    [reply("Hi there.")],
    [
      { toolCalls: [{ argumentsDelta: "", index: 0, name: "send_reply" }] },
      { toolCalls: [{ argumentsDelta: '{"text":"Hi there."}', index: 0 }] },
    ]
  )

  await runModelTurn({ model, prompt: runtimePrompt(), runtime, turn: 1 })

  expect(platform.clearDraft).toHaveBeenCalledTimes(1)
  expect(platform.writeDraft).toHaveBeenCalledWith({
    reasoning: "",
    text: "Hi there.",
    turn: 1,
  })
  expect(platform.spies.clearDraft.mock.invocationCallOrder[0]).toBeLessThan(
    platform.spies.writeDraft.mock.invocationCallOrder[0] ?? 0
  )
})

test("a turn that stops without a reply clears its draft", async () => {
  const platform = createPlatform()
  const runtime = createRuntime({ context: surface("console"), platform })
  const model = streamingModel(
    [{ content: "Hm.", type: "stop" }],
    [{ content: "Hm." }]
  )

  await runModelTurn({ model, prompt: runtimePrompt(), runtime, turn: 1 })

  expect(platform.clearDraft).toHaveBeenCalledTimes(2)
  expect(platform.writeDraft).not.toHaveBeenCalled()
})

test("a failed model call clears its draft", async () => {
  const platform = createPlatform()
  const runtime = createRuntime({ context: surface("console"), platform })
  const model: ModelRuntime = {
    complete: async (args) => {
      args.onDelta?.({
        toolCalls: [
          { argumentsDelta: '{"text":"Hi', index: 0, name: "send_reply" },
        ],
      })
      throw new Error("Connection reset")
    },
  }

  await expect(
    runModelTurn({ model, prompt: runtimePrompt(), runtime, turn: 1 })
  ).rejects.toThrow("Connection reset")

  expect(platform.writeDraft).toHaveBeenCalledWith({
    reasoning: "",
    text: "Hi",
    turn: 1,
  })
  expect(platform.clearDraft).toHaveBeenCalledTimes(2)
  expect(platform.recordEvent).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: "model.failed" })
  )
})

test("other surfaces stream without a draft", async () => {
  const platform = createPlatform()
  const runtime = createRuntime({ context: surface("slack"), platform })
  const model = createQueuedModel([reply("Hi there.")])

  await runModelTurn({ model, prompt: runtimePrompt(), runtime, turn: 1 })

  expect(model.complete.mock.calls[0]?.[0]).not.toHaveProperty("onDelta")
  expect(platform.clearDraft).not.toHaveBeenCalled()
  expect(platform.writeDraft).not.toHaveBeenCalled()
})

function surface(surface: "console" | "slack") {
  return runtimeContext({
    activeSurface: { communicated: false, surface, target: null },
  })
}

/** A queued model that offers the given deltas before each answer. */
function streamingModel(
  responses: QueuedModelResponse[],
  deltas: ModelDelta[]
): ModelRuntime {
  const queued = createQueuedModel(responses)

  return {
    complete: async (args) => {
      for (const delta of deltas) {
        args.onDelta?.(delta)
      }

      return await queued.complete(args)
    },
  }
}

function reply(text: string): QueuedModelResponse {
  return {
    content: null,
    toolCalls: [{ args: { text }, id: "call_1", name: "send_reply" }],
    type: "tool_calls",
  }
}
