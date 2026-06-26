import { expect, test } from "vitest"
import { type DataModel, type Doc, type Id } from "../_generated/dataModel"
import { collectPendingReactionBatch, formatRuntimeReaction } from "./cursor"

test("drains only reactions to Milo-authored targets", () => {
  const batch = collectPendingReactionBatch(
    [
      reaction("last", 1, {
        targetActor: { externalId: "UBOT", kind: "self" },
      }),
      reaction("other", 2, {
        targetActor: { externalId: "U123", kind: "user" },
      }),
      reaction("self", 3, {
        targetActor: { externalId: "UBOT", kind: "self" },
      }),
    ],
    session("last", 1),
    10,
    false
  )

  expect(batch.reactions.map((item) => item._id)).toEqual(["self"])
  expect(batch.cursor?._id).toBe("self")
  expect(batch.hasMore).toBe(false)
})

test("supports timestamp-only reaction cursors for new runs", () => {
  const batch = collectPendingReactionBatch(
    [
      reaction("same", 10, {
        targetActor: { externalId: "UBOT", kind: "self" },
      }),
      reaction("next", 11, {
        targetActor: { externalId: "UBOT", kind: "self" },
      }),
    ],
    {
      _id: id<"sessions">("session"),
      _creationTime: 0,
      watchId: id<"watches">("watch"),
      reactionCursor: { timestamp: 10 },
      updatedAt: 0,
    },
    10,
    false
  )

  expect(batch.reactions.map((item) => item._id)).toEqual(["next"])
  expect(batch.cursor?._id).toBe("next")
  expect(batch.hasMore).toBe(false)
})

test("formats runtime reactions with target identifiers and preview", () => {
  expect(
    formatRuntimeReaction(
      reaction("reaction", 1, {
        actor: { externalId: "U123", kind: "user", name: "Albin" },
        reaction: "✅",
        targetActor: { externalId: "UBOT", kind: "self" },
        targetIdentifiers: ["linear:issue:ISS-1", "linear:comment:comment"],
        targetText: "I can proceed with option B.",
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
})

function session(reactionId: string, timestamp: number): Doc<"sessions"> {
  return {
    _id: id<"sessions">("session"),
    _creationTime: 0,
    watchId: id<"watches">("watch"),
    reactionCursor: {
      reactionId: id<"reactions">(reactionId),
      timestamp,
    },
    updatedAt: 0,
  }
}

function reaction(
  reactionId: string,
  createdAt: number,
  overrides: Partial<Doc<"reactions">> = {}
): Doc<"reactions"> {
  return {
    _id: id<"reactions">(reactionId),
    _creationTime: createdAt,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "linear",
    key: reactionId,
    action: "added",
    reaction: "👍",
    targetKey: "linear:comment:comment",
    targetIdentifiers: ["linear:comment:comment"],
    createdAt,
    ...overrides,
  }
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
