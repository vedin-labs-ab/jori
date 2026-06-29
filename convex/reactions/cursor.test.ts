import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { collectPendingReactionBatch, formatRuntimeReaction } from "./cursor"

const self = { externalId: "UBOT", kind: "self" as const }
const user = { externalId: "U123", kind: "person" as const }

test("drains only reactions to Milo-authored targets", () => {
  const batch = collectPendingReactionBatch(
    [
      reaction("a", 1, { target: reactionTarget({ actor: self }) }),
      reaction("b", 2, { target: reactionTarget({ actor: user }) }),
      reaction("c", 3, { target: reactionTarget({ actor: self }) }),
    ],
    session({ updatedAt: 1, createdAt: 1 }),
    10,
    false
  )

  expect(batch.reactions.map((item) => item._id)).toEqual(["c"])
  expect(batch.cursor?._id).toBe("c")
  expect(batch.hasMore).toBe(false)
})

test("re-drains a row whose status changed after the cursor", () => {
  const batch = collectPendingReactionBatch(
    [
      reaction("r", 7, {
        storedAt: 5,
        removedAt: 700,
        target: reactionTarget({ actor: self }),
      }),
    ],
    session({ updatedAt: 5, createdAt: 5 }),
    10,
    false
  )

  expect(batch.reactions.map((item) => item._id)).toEqual(["r"])
  expect(batch.cursor?._id).toBe("r")
})

test("breaks updatedAt ties on cursor createdAt", () => {
  const batch = collectPendingReactionBatch(
    [
      reaction("earlier", 5, {
        storedAt: 3,
        target: reactionTarget({ actor: self }),
      }),
      reaction("later", 5, {
        storedAt: 9,
        target: reactionTarget({ actor: self }),
      }),
    ],
    session({ updatedAt: 5, createdAt: 5 }),
    10,
    false
  )

  expect(batch.reactions.map((item) => item._id)).toEqual(["later"])
})

test("drains reactions after a synthetic start cursor", () => {
  const batch = collectPendingReactionBatch(
    [
      reaction("before", 9, { target: reactionTarget({ actor: self }) }),
      reaction("same-before", 10, {
        storedAt: 9,
        target: reactionTarget({ actor: self }),
      }),
      reaction("same-after", 10, {
        storedAt: 11,
        target: reactionTarget({ actor: self }),
      }),
      reaction("after", 11, { target: reactionTarget({ actor: self }) }),
    ],
    session({ updatedAt: 10, createdAt: 10 }),
    10,
    false
  )

  expect(batch.reactions.map((item) => item._id)).toEqual([
    "same-after",
    "after",
  ])
})

test("formats added and removed runtime reactions", () => {
  expect(
    formatRuntimeReaction(
      reaction("added", 1, {
        actor: { externalId: "U123", kind: "person", name: "Albin" },
        reaction: "✅",
        target: reactionTarget({
          actor: self,
          identifiers: ["linear:issue:ISS-1", "linear:comment:comment"],
          text: "I can proceed with option B.",
        }),
      })
    )
  ).toMatchObject({
    actor: "Albin",
    identifiers: ["linear:issue:ISS-1", "linear:comment:comment"],
    preview: "I can proceed with option B.",
    reaction: "✅",
    target: "Milo",
    type: "reaction.added",
  })

  expect(
    formatRuntimeReaction(
      reaction("removed", 4, {
        removedAt: 400,
        target: reactionTarget({ actor: self }),
      })
    )
  ).toMatchObject({ observedAt: 400, type: "reaction.removed" })
})

function session(reaction?: {
  createdAt: number
  updatedAt: number
}): Doc<"sessions"> {
  return {
    _id: id<"sessions">("session"),
    _creationTime: 0,
    watchId: id<"watches">("watch"),
    ...(reaction === undefined ? {} : { cursor: { reaction } }),
    updatedAt: 0,
  }
}

function reaction(
  reactionId: string,
  updatedAt: number,
  overrides: Partial<Doc<"reactions">> & { storedAt?: number } = {}
): Doc<"reactions"> {
  const { storedAt, ...rest } = overrides

  return {
    _id: id<"reactions">(reactionId),
    _creationTime: storedAt ?? updatedAt,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "linear",
    reaction: "👍",
    observedAt: updatedAt,
    target: reactionTarget(),
    updatedAt,
    createdAt: storedAt ?? updatedAt,
    ...rest,
  }
}

function reactionTarget(
  overrides: Partial<Doc<"reactions">["target"]> = {}
): Doc<"reactions">["target"] {
  return {
    key: "linear:comment:comment",
    conversationId: "ISS-1",
    identifiers: ["linear:comment:comment"],
    ...overrides,
  }
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
