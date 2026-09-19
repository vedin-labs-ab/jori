import { R2 } from "@convex-dev/r2"
import { urlWindowMs } from "../../../contracts/runtime/files"
import { components } from "../../_generated/api"
import { type ActionCtx, type MutationCtx } from "../../_generated/server"
import { requireEnvironmentVariable } from "../../shared/environment"
import { requireRegion } from "../../shared/origin"

/** File bytes live in a private Cloudflare R2 bucket behind Convex's R2
 *  component. The endpoint is the deployment region's jurisdiction, so an EU
 *  deployment cannot reach a bucket outside the EU however it is configured.
 *  Bytes leave only through these calls or a URL signed here. */
function bucket() {
  return new R2(components.r2, {
    endpoint: `https://${requireEnvironmentVariable("R2_ACCOUNT_ID")}.${requireRegion()}.r2.cloudflarestorage.com`,
  })
}

/** Keys carry their organization, so a record can only claim its own
 *  upload, once. The type comes from storage, never from the client. */
export async function requireUnusedUpload(
  ctx: MutationCtx,
  args: { organizationId: string; key: string }
) {
  const metadata = args.key.startsWith(`${args.organizationId}/`)
    ? await bucket().getMetadata(ctx, args.key)
    : null
  if (metadata === null) {
    throw new Error("Uploaded file was not found in storage")
  }
  if ((await linkedFile(ctx, args.key)) !== null) {
    throw new Error("Uploaded file is already in use")
  }
  return { mimeType: metadata.contentType ?? "application/octet-stream" }
}

export async function linkedFile(ctx: MutationCtx, key: string) {
  return await ctx.db
    .query("files")
    .withIndex("by_blobKey", (index) => index.eq("blobKey", key))
    .first()
}

export async function blobUploadUrl(organizationId: string) {
  return await bucket().generateUploadUrl(
    `${organizationId}/${crypto.randomUUID()}`
  )
}

/** Valid for two URL windows; callers re-request every window. See
 *  contracts/files. */
export async function blobUrl(key: string) {
  return await bucket().getUrl(key, { expiresIn: (2 * urlWindowMs) / 1000 })
}

/** Reads type and size from storage itself; nothing the client claims is
 *  recorded. The component's HEAD loses Content-Length in this runtime, so
 *  the size comes from a one-byte ranged read. */
export async function syncBlob(ctx: ActionCtx, key: string) {
  await bucket().syncMetadata(ctx, key)
  const response = await fetch(await bucket().getUrl(key, { expiresIn: 60 }), {
    headers: { Range: "bytes=0-0" },
  })
  const total = response.headers.get("content-range")?.split("/")[1]
  // An empty object has no first byte to range over.
  const size = response.status === 416 ? 0 : Number(total)
  if (!Number.isInteger(size)) {
    throw new Error("Uploaded file was not found in storage")
  }
  return size
}

export async function storeBlob(
  ctx: ActionCtx,
  args: { organizationId: string; bytes: Uint8Array; mimeType: string }
) {
  return await bucket().store(ctx, new Uint8Array(args.bytes), {
    key: `${args.organizationId}/${crypto.randomUUID()}`,
    type: args.mimeType,
  })
}

/** The URL never leaves this call. */
export async function readBlob(key: string) {
  const response = await fetch(await bucket().getUrl(key, { expiresIn: 60 }))
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error("The stored file could not be read.")
  }
  return await response.blob()
}

/** Unlink the file row first, in the same mutation. The component retries
 *  the storage delete until it lands. */
export async function deleteBlob(ctx: MutationCtx | ActionCtx, key: string) {
  await bucket().deleteObject(ctx, key)
}

export async function listBlobs(ctx: MutationCtx, cursor: string | null) {
  return await bucket().listMetadata(ctx, 50, cursor)
}
