import { afterEach, expect, test, vi } from "vitest"
import { createPlatform } from "../../../test/platform"
import {
  createRuntime,
  emptyTokens,
  runtimeContext,
} from "../../../test/runtime"
import { type ModelResponse } from "../model/types"
import { createDraftWriter, type DraftContent, openDraft } from "./draft"

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test("writes at once, then no sooner than the interval after the last write", async () => {
  vi.useFakeTimers()
  const write = vi.fn(async (_content: DraftContent) => undefined)
  const writer = createDraftWriter(write)

  writer.update(reply("Hel"))
  expect(write).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(0)
  writer.update(reply("Hello wor"))
  await vi.advanceTimersByTimeAsync(249)
  expect(write).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(1)
  expect(write).toHaveBeenCalledTimes(2)
  expect(write).toHaveBeenLastCalledWith(reply("Hello wor"))
})

test("a clause boundary is written without waiting", async () => {
  vi.useFakeTimers()
  const write = vi.fn(async (_content: DraftContent) => undefined)
  const writer = createDraftWriter(write)

  writer.update(reply("Hel"))
  await vi.advanceTimersByTimeAsync(0)
  writer.update(reply("Hello,"))

  expect(write).toHaveBeenCalledTimes(2)
  expect(write).toHaveBeenLastCalledWith(reply("Hello,"))
})

test("reasoning under a still reply waits its interval", async () => {
  vi.useFakeTimers()
  const write = vi.fn(async (_content: DraftContent) => undefined)
  const writer = createDraftWriter(write)

  writer.update({ reasoning: "Reading", text: "Hello." })
  await vi.advanceTimersByTimeAsync(0)
  writer.update({ reasoning: "Reading the notes.", text: "Hello." })
  await vi.advanceTimersByTimeAsync(249)

  expect(write).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(1)
  expect(write).toHaveBeenLastCalledWith({
    reasoning: "Reading the notes.",
    text: "Hello.",
  })
})

test("one write is in flight at a time and the newest text follows it", async () => {
  vi.useFakeTimers()
  const { land, write } = deferredWrites()
  const writer = createDraftWriter(write)

  writer.update(reply("a"))
  writer.update(reply("ab"))
  writer.update(reply("abc"))
  expect(write).toHaveBeenCalledTimes(1)

  land()
  await vi.advanceTimersByTimeAsync(250)

  expect(write).toHaveBeenCalledTimes(2)
  expect(write).toHaveBeenLastCalledWith(reply("abc"))
})

test("settling waits for the write in flight and takes no more", async () => {
  vi.useFakeTimers()
  const { land, write } = deferredWrites()
  const writer = createDraftWriter(write)

  writer.update(reply("a"))
  writer.update(reply("ab"))

  const settled = writer.settle()

  land()
  expect(await settled).toEqual(reply("a"))

  writer.update(reply("abc"))
  await vi.advanceTimersByTimeAsync(1_000)
  expect(write).toHaveBeenCalledTimes(1)
})

test("a failed write is logged and the next text still goes out", async () => {
  vi.useFakeTimers()
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
  const write = vi
    .fn(async (_content: DraftContent) => undefined)
    .mockRejectedValueOnce(new Error("Offline"))
  const writer = createDraftWriter(write)

  writer.update(reply("a"))
  await vi.advanceTimersByTimeAsync(0)
  expect(warn).toHaveBeenCalledWith("Draft write failed.", { error: "Offline" })

  writer.update(reply("ab"))
  await vi.advanceTimersByTimeAsync(250)
  expect(write).toHaveBeenLastCalledWith(reply("ab"))
  expect(await writer.settle()).toEqual(reply("ab"))
})

test("only the console has a draft", () => {
  expect(openDraft(createRuntime(), 1)).toBeNull()
  expect(openDraft(createRuntime({ context: surface("slack") }), 1)).toBeNull()
  expect(
    openDraft(createRuntime({ context: surface("console") }), 1)
  ).not.toBeNull()
})

test("the draft follows the first reply call and no other", async () => {
  const platform = createPlatform()
  const draft = requireDraft(platform, 2)

  draft.onDelta({
    toolCalls: [
      { argumentsDelta: "", index: 0, name: "add_note" },
      { argumentsDelta: "", index: 1, name: "send_reply" },
    ],
  })
  draft.onDelta({
    toolCalls: [
      { argumentsDelta: '{"text":"Hi', index: 1 },
      { argumentsDelta: '{"text":"note"}', index: 0 },
      { argumentsDelta: '{"text":"other"}', index: 2, name: "send_reply" },
    ],
  })
  await draft.close(replyResponse("Hi there."))

  expect(platform.spies.writeDraft.mock.calls).toEqual([
    [{ reasoning: "", text: "Hi", turn: 2 }],
    [{ reasoning: "", text: "Hi there.", turn: 2 }],
  ])
  expect(platform.clearDraft).not.toHaveBeenCalled()
})

test("reasoning streams into the draft, kept to its tail, and stays under the reply", async () => {
  vi.useFakeTimers()
  const platform = createPlatform()
  const draft = requireDraft(platform, 1)

  draft.onDelta({ reasoning: "a".repeat(1_500) })
  await vi.advanceTimersByTimeAsync(0)
  draft.onDelta({ reasoning: "b".repeat(1_000) })
  draft.onDelta({ reasoning: "" })
  await vi.advanceTimersByTimeAsync(250)
  draft.onDelta({
    toolCalls: [
      { argumentsDelta: '{"text":"Hi.', index: 0, name: "send_reply" },
    ],
  })
  await draft.close(replyResponse("Hi."))

  const tail = "a".repeat(1_000) + "b".repeat(1_000)

  expect(platform.spies.writeDraft.mock.calls).toEqual([
    [{ reasoning: "a".repeat(1_500), text: "", turn: 1 }],
    [{ reasoning: tail, text: "", turn: 1 }],
    [{ reasoning: tail, text: "Hi.", turn: 1 }],
  ])
})

test("a turn without a reply, a reset, and a discard all leave nothing", async () => {
  const platform = createPlatform()
  const draft = requireDraft(platform, 1)

  await draft.reset()
  await draft.close({
    content: "Thinking aloud.",
    reasoning: null,
    tokens: emptyTokens(),
    type: "stop",
  })
  await draft.discard()

  expect(platform.clearDraft).toHaveBeenCalledTimes(3)
  expect(platform.writeDraft).not.toHaveBeenCalled()
})

function reply(text: string): DraftContent {
  return { reasoning: "", text }
}

function deferredWrites() {
  const pending: Array<() => void> = []

  return {
    land: () => pending.shift()?.(),
    write: vi.fn(
      (_content: DraftContent) =>
        new Promise<void>((resolve) => {
          pending.push(resolve)
        })
    ),
  }
}

function surface(surface: "console" | "slack") {
  return runtimeContext({
    activeSurface: { communicated: false, surface, target: null },
  })
}

function requireDraft(
  platform: ReturnType<typeof createPlatform>,
  turn: number
) {
  const draft = openDraft(
    createRuntime({ context: surface("console"), platform }),
    turn
  )

  if (draft === null) {
    throw new Error("The console runtime has no draft.")
  }

  return draft
}

function replyResponse(text: string): ModelResponse {
  return {
    content: null,
    reasoning: null,
    tokens: emptyTokens(),
    toolCalls: [{ args: { text }, id: "call_1", name: "send_reply" }],
    type: "tool_calls",
  }
}
