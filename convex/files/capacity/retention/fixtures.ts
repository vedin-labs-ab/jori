import { type MutationCtx } from "../../../_generated/server"
import { ensureAccount } from "../../../billing/account"
import { seedBlob } from "../../blobs/fixtures"
import { changeUsage, usageBucket } from "../meter"

export async function requireUsage(ctx: MutationCtx, organizationId = "org") {
  const row = await usageBucket(ctx, organizationId)
  if (row === null) {
    throw new Error("Missing storage fixture")
  }
  return row
}

export async function seedFile(
  ctx: MutationCtx,
  args: {
    organizationId?: string
    size: number
    createdAt: number
    private?: boolean
  }
) {
  const organizationId = args.organizationId ?? "org"
  const blobKey = await seedBlob(ctx, organizationId, { size: args.size })
  const fileId = await ctx.db.insert("files", {
    organizationId,
    name: `file-${args.createdAt}.txt`,
    mimeType: "text/plain",
    blobKey,
    size: args.size,
    visibility: { mode: args.private ? "private" : "organization" },
    metered: true,
    createdAt: args.createdAt,
    updatedAt: args.createdAt,
  })
  await changeUsage(ctx, { organizationId, bytes: args.size, count: 1 })
  return { fileId, blobKey }
}

export async function seedAccount(ctx: MutationCtx, organizationId = "org") {
  const account = await ensureAccount(ctx, organizationId)
  await ctx.db.patch(account._id, { state: { kind: "active" } })
  return account._id
}

export async function seedNotice(
  ctx: MutationCtx,
  organizationId = "org",
  status: "accepted" | "queued" | "failed" = "accepted"
) {
  return await ctx.db.insert("emailSubmissions", {
    organizationId,
    region: "eu",
    status,
    attempts: 1,
    expiresAt: Date.now() + 40 * 86_400_000,
  })
}
