import { expect, test } from "vitest"
import { id } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveRunAudience } from "./audience"

test("resolves conversation and job audiences", async () => {
  const ctx = { db: { get: async () => null } } as unknown as MutationCtx

  await expect(
    resolveRunAudience(ctx, {
      origin: { conversation: conversation("organization") },
      run: {},
    })
  ).resolves.toEqual({
    audience: "organization",
    conversationId: id<"conversations">("conversation"),
  })
  await expect(
    resolveRunAudience(ctx, {
      origin: { conversation: conversation("person") },
      run: {},
    })
  ).resolves.toEqual({
    audience: "person",
    conversationId: id<"conversations">("conversation"),
  })
  await expect(
    resolveRunAudience(ctx, {
      origin: { job: job() },
      run: {},
    })
  ).resolves.toEqual({ audience: "person" })
  await expect(
    resolveRunAudience(ctx, {
      origin: { job: job("organization") },
      run: {},
    })
  ).resolves.toEqual({ audience: "organization" })
})

function conversation(
  scope: Doc<"conversations">["scope"]
): Doc<"conversations"> {
  return {
    _creationTime: 0,
    _id: id<"conversations">("conversation"),
    externalId: "external",
    surface: "slack",
    integrationId: id<"integrations">("integration"),
    scope,
    organizationId: "organization",
  }
}

function job(
  visibility: Doc<"jobs">["visibility"]["mode"] = "private"
): Doc<"jobs"> {
  return {
    _creationTime: 0,
    _id: id<"jobs">("job"),
    access: { integrations: [], jori: [] },
    createdAt: 0,
    instructions: "Do it",
    name: "Job",
    principal:
      visibility === "organization"
        ? { kind: "organization" }
        : { kind: "person", personId: "person" as Id<"persons"> },
    status: "active",
    organizationId: "organization",
    trigger: { at: 1 },
    type: "once",
    updatedAt: 0,
    visibility: { mode: visibility } as Doc<"jobs">["visibility"],
  }
}
