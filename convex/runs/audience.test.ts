import { expect, test } from "vitest"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveRunAudience } from "./audience"

test("resolves conversation and automation audiences", async () => {
  const ctx = { db: { get: async () => null } } as unknown as MutationCtx

  await expect(
    resolveRunAudience(ctx, {
      origin: { conversation: conversation("organization") },
      run: {},
    })
  ).resolves.toEqual({
    scope: "organization",
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
  await expect(
    resolveRunAudience(ctx, {
      origin: { automation: automation("organization") },
      run: {},
    })
  ).resolves.toEqual({ scope: "organization" })
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
    organizationId: "organization",
  }
}

function automation(
  scope: Doc<"automations">["scope"] = "personal"
): Doc<"automations"> {
  return {
    _creationTime: 0,
    _id: id<"automations">("automation"),
    access: { integrations: [], web: false },
    createdAt: 0,
    instructions: "Do it",
    name: "Automation",
    principal:
      scope === "organization"
        ? { kind: "organization" }
        : { kind: "person", personId: "person" as Id<"persons"> },
    status: "active",
    organizationId: "organization",
    trigger: { at: 1 },
    type: "once",
    updatedAt: 0,
    scope,
  }
}

function id<TableName extends "automations" | "conversations" | "integrations">(
  value: string
) {
  return value as Id<TableName>
}
