import { expect, test } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveRunAudience } from "./audience"

test("resolves conversation and automation audiences", async () => {
  const ctx = { db: { get: async () => null } } as unknown as MutationCtx

  await expect(
    resolveRunAudience(ctx, {
      origin: {
        conversation: {
          conversation: conversation("public"),
          integration: integration("slack"),
        },
      },
      run: {},
    })
  ).resolves.toEqual({
    scope: "tenant",
    conversationId: id<"conversations">("conversation"),
  })
  await expect(
    resolveRunAudience(ctx, {
      origin: {
        conversation: {
          conversation: conversation("private"),
          integration: integration("slack"),
        },
      },
      run: {},
    })
  ).resolves.toEqual({
    scope: "conversation",
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
  visibility: Doc<"conversations">["visibility"]
): Doc<"conversations"> {
  return {
    _creationTime: 0,
    _id: id<"conversations">("conversation"),
    externalId: "external",
    integrationId: id<"integrations">("integration"),
    tenantId: "tenant",
    visibility,
  }
}

function integration(
  provider: Doc<"integrations">["integration"]
): Doc<"integrations"> {
  return {
    _creationTime: 0,
    _id: id<"integrations">("integration"),
    createdAt: 0,
    createdBy: id<"persons">("person"),
    credentials: {},
    externalId: "external",
    integration: provider,
    scope: "tenant",
    status: "active",
    tenantId: "tenant",
    updatedAt: 0,
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

function id<
  TableName extends
    | "automations"
    | "conversations"
    | "integrations"
    | "persons",
>(value: string) {
  return value as Id<TableName>
}
