import { components } from "../../_generated/api"
import { type MutationCtx } from "../../_generated/server"

/** The bucket test/convex/blobs configures. Nothing here reaches storage:
 *  a blob exists when the R2 component holds its metadata. */
export const bucket = "test-bucket"

/** An upload as storage reports it once synced. */
export async function seedBlob(
  ctx: MutationCtx,
  organizationId: string,
  blob: { size?: number; mimeType?: string; lastModified?: number } = {}
) {
  const key = `${organizationId}/${crypto.randomUUID()}`
  await ctx.runMutation(components.r2.lib.upsertMetadata, {
    bucket,
    key,
    size: blob.size ?? 12,
    contentType: blob.mimeType ?? "text/plain",
    lastModified: new Date(blob.lastModified ?? Date.now()).toISOString(),
    link: "",
  })
  return key
}

export async function blobExists(ctx: MutationCtx, key: string) {
  const page = await ctx.runQuery(components.r2.lib.listMetadata, {
    bucket,
    endpoint: "https://account.eu.r2.cloudflarestorage.com",
    accessKeyId: "access-key",
    secretAccessKey: "secret-key",
  })
  return page.page.some((blob: { key: string }) => blob.key === key)
}
