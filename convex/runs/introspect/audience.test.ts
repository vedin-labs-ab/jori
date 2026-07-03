import { expect, test } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveRunAudience } from "./audience"

test("resolves conversation and automation audiences", async () => {
  const ctx = { db: { get: async () => null } } as unknown as MutationCtx

  await expect(
    resolveRunAudience(ctx, {
      origin: { conversation: conversation("tenant") },
      run: {},
    })
  ).resolves.toEqual({
    scope: "tenant",
    conversationId: id<"conversations">("conversation"),
  })
  await expect(
    resolveRunAudience(ctx, {
      origin: { conversation: conversation("person") },
      run: {},
    })
  ).resolves.toEqual({
    scope: "person",
    conversationId: id<"conversations">("conversation"),
  })
  await expect(
    resolveRunAudience(ctx, {
      origin: { automation: automation() },
      run: {},
    })
  ).resolves.toEqual({ scope: "person" })
})

function conversation(
  scope: Doc<"conversations">["scope"]
): Doc<"conversations"> {
  return {
    _creationTime: 0,
    _id: id<"conversations">("conversation"),
    externalId: "external",
    integrationId: id<"integrations">("integration"),
    scope,
    tenantId: "tenant",
  }
}

function automation(): Doc<"automations"> {
  return {
    _creationTime: 0,
    _id: id<"automations">("automation"),
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Do it",
    name: "Automation",
    status: "active",
    tenantId: "tenant",
    trigger: { at: 1 },
    type: "once",
    updatedAt: 0,
    visibility: "private",
  }
}

function id<TableName extends "automations" | "conversations" | "integrations">(
  value: string
) {
  return value as Id<TableName>
}
