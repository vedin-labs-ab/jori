import { expect, test, vi } from "vitest"
import { type ReplyPart } from "../../contracts/replies/parts"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { sendSurfaceReply } from "./reply"

const conversationId = "conversations:1" as Id<"conversations">
const parts: ReplyPart[] = [
  { kind: "reference", target: { kind: "file", id: "files:1" } },
]

test("a console reply is written into the conversation through a mutation", async () => {
  const runMutation = vi.fn(async () => "messages:2")
  const ctx = { runMutation } as unknown as ActionCtx

  await sendSurfaceReply(
    ctx,
    consoleInput(),
    { type: "console", conversationId },
    { parts, text: "Done." }
  )

  expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
    conversationId,
    parts,
    runId: "runs:1",
    text: "Done.",
  })
})

test("a provider address needs the run's integration", async () => {
  const ctx = { runMutation: vi.fn() } as unknown as ActionCtx

  await expect(
    sendSurfaceReply(
      ctx,
      consoleInput(),
      { type: "slack", channelId: "C1", threadTs: "1.2" },
      { text: "Done." }
    )
  ).rejects.toThrow("The console surface has no integration.")
})

function consoleInput(): Extract<AgentRuntimeInput, { type: "message" }> {
  return {
    type: "message",
    surface: "console",
    run: { _id: "runs:1" } as Doc<"runs">,
    integration: null,
    integrations: [],
    message: { _id: "messages:1", surface: "console" } as Doc<"messages">,
    conversation: { entries: [], hasMoreMessages: false, summary: null },
    organization: null,
    requester: null,
    place: null,
    timezone: null,
    workstreams: null,
  }
}
