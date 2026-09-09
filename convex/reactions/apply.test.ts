import { expect, test } from "vitest"
import {
  databaseContext,
  id,
  type TestDatabase,
} from "../../test/convex/database"
import { integrationDoc } from "../../test/convex/integrations"
import { type Doc } from "../_generated/dataModel"
import { reconcileTargetReactions, recordReactionEvent } from "./apply"

const target = {
  key: "github:comment:acme/app:123",
  identifiers: ["github:comment:123"],
}
const albin = { externalId: "456", kind: "person" as const, name: "Albin" }
const sarah = { externalId: "789", kind: "person" as const, name: "Sarah" }

test("reconcile inserts present reactions and tombstones absent ones", async () => {
  const { database, ctx } = databaseContext()
  await database.insert("messages", targetMessage())

  const first = await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [{ reaction: "👍", actor: albin }],
    target,
  })
  expect(first).toEqual({ active: 1, recorded: 1 })

  await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [
      { reaction: "👍", actor: albin },
      { reaction: "👀", actor: sarah },
    ],
    target,
  })

  const removal = await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [{ reaction: "👀", actor: sarah }],
    target,
  })
  expect(removal).toEqual({ active: 1, recorded: 1 })

  const rows = await reactionRows(database)
  expect(rows).toHaveLength(2)
  expect(rows.filter(isActive).map((row) => row.reaction)).toEqual(["👀"])
  expect(rows.every((row) => typeof row.observedAt === "number")).toBe(true)
  expect(rows.every((row) => row.target.key === target.key)).toBe(true)
})

test("re-adding a removed reaction reuses the row and clears the tombstone", async () => {
  const { database, ctx } = databaseContext()
  await database.insert("messages", targetMessage())

  await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [{ reaction: "👍", actor: albin }],
    target,
  })
  await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [],
    target,
  })

  const removed = await reactionRows(database)
  expect(removed).toHaveLength(1)
  expect(typeof removed[0].removedAt).toBe("number")
  const removedUpdatedAt = removed[0].updatedAt

  await reconcileTargetReactions(ctx, {
    integration: githubIntegration(),
    reactions: [{ reaction: "👍", actor: albin }],
    target,
  })

  const readded = await reactionRows(database)
  expect(readded).toHaveLength(1)
  expect(readded[0].removedAt).toBeUndefined()
  expect(readded[0].updatedAt).toBeGreaterThan(removedUpdatedAt)
})

test("event removal then re-add toggles the same row", async () => {
  const { database, ctx } = databaseContext()
  await database.insert("messages", targetMessage())

  for (const action of ["added", "removed", "added"] as const) {
    await recordReactionEvent(ctx, {
      action,
      actor: albin,
      integration: githubIntegration(),
      reaction: "👍",
      target,
    })
  }

  const rows = await reactionRows(database)
  expect(rows).toHaveLength(1)
  expect(rows[0].removedAt).toBeUndefined()
})

function isActive(row: Doc<"reactions">) {
  return row.removedAt === undefined
}

async function reactionRows(database: TestDatabase) {
  return (await database.query("reactions").collect()) as Doc<"reactions">[]
}

function githubIntegration(): Doc<"integrations"> {
  return integrationDoc({
    integration: "github",
    externalId: "installation",
    data: { appSlug: "jori", botLogin: "jori[bot]" },
  })
}

function targetMessage(): Doc<"messages"> {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    surface: "github",
    type: "comment.issue.created",
    externalId: "message",
    mentioned: false,
    actor: { externalId: "999", kind: "bot", name: "jori[bot]" },
    conversationId: "acme/app#12",
    targetKey: target.key,
    text: "Jori reply.",
    createdAt: 0,
  }
}
