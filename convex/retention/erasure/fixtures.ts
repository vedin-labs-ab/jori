import { type StorageActionWriter } from "convex/server"
import { type MutationCtx } from "../../_generated/server"
import { authComponent, createAdapterOptions } from "../../auth"
export async function seedContent(
  ctx: MutationCtx & { storage: StorageActionWriter }
) {
  const retention = await ctx.db.insert("workspaceRetention", {
    organizationId: "org",
    state: "deleting",
    endedAt: 1,
    deletesAt: 1,
    stage: 6,
  })
  const collection = await ctx.db.insert("collections", {
    organizationId: "org",
    visibility: { mode: "organization" },
    kind: "store",
    name: "Private",
    schemaHash: "hash",
    createdAt: 1,
    updatedAt: 1,
  })
  for (let index = 0; index < 60; index++) {
    await ctx.db.insert("documents", {
      collectionId: collection,
      value: { secret: index },
      version: 1,
      createdAt: 1,
      updatedAt: 1,
    })
  }
  const other = await ctx.db.insert("collections", {
    organizationId: "other",
    visibility: { mode: "organization" },
    kind: "store",
    name: "Keep",
    schemaHash: "hash",
    createdAt: 1,
    updatedAt: 1,
  })
  const kept = await ctx.db.insert("documents", {
    collectionId: other,
    value: { keep: true },
    version: 1,
    createdAt: 1,
    updatedAt: 1,
  })
  const storageId = await seedFile(ctx)
  const receipt = await ctx.db.insert("transactions", {
    organizationId: "org",
    timestamp: 1,
    type: "topup",
    micros: { amount: 10, balance: 0 },
    stripeId: "cs_test",
    auto: false,
  })
  return { retention, collection, other, kept, storageId, receipt }
}

export async function seedAuth(ctx: MutationCtx) {
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  const user = await adapter.create<{ id: string }>({
    model: "user",
    data: {
      name: "Test",
      email: "owner@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  const org = await adapter.create<{ id: string }>({
    model: "organization",
    data: { name: "Delete", slug: "delete", createdAt: new Date() },
  })
  const other = await adapter.create<{ id: string }>({
    model: "organization",
    data: { name: "Keep", slug: "keep", createdAt: new Date() },
  })
  for (const organizationId of [org.id, other.id]) {
    await adapter.create({
      model: "member",
      data: {
        organizationId,
        userId: user.id,
        role: "owner",
        createdAt: new Date(),
      },
    })
  }
  const team = await adapter.create<{ id: string }>({
    model: "team",
    data: { organizationId: org.id, name: "Team", createdAt: new Date() },
  })
  await adapter.create({
    model: "teamMember",
    data: { teamId: team.id, userId: user.id, createdAt: new Date() },
  })
  await seedInvitations(ctx, org.id, user.id)
  return { user: user.id, org: org.id, other: other.id }
}

async function seedFile(ctx: MutationCtx & { storage: StorageActionWriter }) {
  const storageId = await ctx.storage.store(new Blob(["private file"]))
  await ctx.db.insert("files", {
    organizationId: "org",
    visibility: { mode: "organization" },
    storageId,
    name: "secret.txt",
    mimeType: "text/plain",
    size: 12,
    createdAt: 1,
    updatedAt: 1,
  })

  return storageId
}

async function seedInvitations(
  ctx: MutationCtx,
  organizationId: string,
  userId: string
) {
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  await adapter.create({
    model: "invitation",
    data: {
      organizationId,
      email: "invitee@example.com",
      status: "pending",
      inviterId: userId,
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
    },
  })
  await adapter.create({
    model: "session",
    data: {
      userId,
      token: "synthetic-test-session",
      activeOrganizationId: organizationId,
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}
