"use node"

import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { getToolPermission } from "../permissions/catalog"
import {
  type ArtifactBuildInput,
  type BuildAsset,
  validateArtifactBuild,
} from "./build"
import { normalizeArtifactContract } from "./contract"
import {
  type ArtifactSourceFile,
  createArtifactSourceSnapshot,
  type StoredArtifactBlob,
} from "./source"
import { artifactEntrypoint } from "./template"
import { type ArtifactConsoleLink, artifactConsoleLink } from "./urls"

type PublishedVersion = {
  artifactId: Id<"artifacts">
  versionId: Id<"artifactVersions">
}

export type PublishResult = PublishedVersion & ArtifactConsoleLink

export type SourceReadResult = {
  artifactId: Id<"artifacts">
  files: Array<{
    path: string
    content: string
    blobId: string
    mimeType: string
    byteSize: number
  }>
} | null

export type PublishArtifactArgs =
  | {
      mode: "create"
      tenantId: string
      title: string
      access: "personal" | "organization"
      contract?: unknown
      source: ArtifactSourceFile[]
      build: ArtifactBuildInput
      userId: string
      message?: string
      capabilities?: ArtifactCapabilityInput[]
    }
  | {
      mode: "update"
      tenantId: string
      artifactId: Id<"artifacts">
      title: string
      access: "personal" | "organization"
      contract?: unknown
      source: ArtifactSourceFile[]
      build: ArtifactBuildInput
      userId: string
      message?: string
      capabilities?: ArtifactCapabilityInput[]
    }

type ArtifactCapabilityInput = {
  tool: string
  integrationId?: Id<"integrations">
  versionPinned?: boolean
}

type SourceFileRecord = {
  path: string
  blobId: string
  storageId: Id<"_storage">
  mimeType: string
  byteSize: number
}

export async function publishArtifact(
  ctx: ActionCtx,
  args: PublishArtifactArgs
): Promise<PublishResult> {
  validateCapabilities(args.capabilities ?? [])

  const snapshot = createArtifactSourceSnapshot(args.source)
  const buildAssets = validateArtifactBuild(snapshot.files, args.build)
  const storedStorageIds: Id<"_storage">[] = []

  try {
    const blobs = await storeSourceBlobs(ctx, snapshot, storedStorageIds)
    const assets = await storeBuildAssets(ctx, buildAssets, storedStorageIds)
    const contract = normalizeArtifactContract(args.contract)
    const common = {
      tenantId: args.tenantId,
      title: args.title,
      access: args.access,
      contract,
      treeId: snapshot.treeId,
      trees: snapshot.trees,
      blobs,
      assets,
      entrypoint: artifactEntrypoint,
      sdk: "milo-artifact-sdk@0",
      message: args.message,
      capabilities: args.capabilities ?? [],
    }

    const published =
      args.mode === "create"
        ? await ctx.runMutation(internal.artifacts.records.publishCreated, {
            ...common,
            ownerId: args.userId,
          })
        : await ctx.runMutation(internal.artifacts.records.publishUpdated, {
            ...common,
            artifactId: args.artifactId,
            updatedBy: args.userId,
          })

    return {
      ...published,
      ...artifactConsoleLink(published.artifactId),
    }
  } catch (error) {
    await Promise.allSettled(
      storedStorageIds.map((id) => ctx.storage.delete(id))
    )
    throw error
  }
}

export async function readArtifactSource(
  ctx: ActionCtx,
  args: {
    tenantId: string
    artifactId: Id<"artifacts">
    versionId?: Id<"artifactVersions">
  }
): Promise<SourceReadResult> {
  const files: SourceFileRecord[] | null = await ctx.runQuery(
    internal.artifacts.queries.listSourceFiles,
    args
  )

  if (files === null) {
    return null
  }

  return {
    artifactId: args.artifactId,
    files: await Promise.all(
      files.map(async (file) => {
        const blob = await ctx.storage.get(file.storageId)

        if (blob === null) {
          throw new Error(`Artifact source blob is missing: ${file.path}`)
        }

        return {
          path: file.path,
          content: await blob.text(),
          blobId: file.blobId,
          mimeType: file.mimeType,
          byteSize: file.byteSize,
        }
      })
    ),
  }
}

async function storeSourceBlobs(
  ctx: ActionCtx,
  snapshot: ReturnType<typeof createArtifactSourceSnapshot>,
  storedStorageIds: Id<"_storage">[]
) {
  const existingIds = new Set(
    await ctx.runQuery(internal.artifacts.queries.getExistingBlobIds, {
      ids: snapshot.files.map((file) => file.id),
    })
  )
  const blobs: StoredArtifactBlob[] = []

  for (const file of snapshot.files) {
    if (existingIds.has(file.id)) {
      continue
    }

    const storageId = await ctx.storage.store(
      new Blob([file.content], { type: file.mimeType })
    )
    storedStorageIds.push(storageId)
    blobs.push({
      id: file.id,
      mimeType: file.mimeType,
      byteSize: file.byteSize,
      storageId,
    })
  }

  return blobs
}

async function storeBuildAssets(
  ctx: ActionCtx,
  buildAssets: BuildAsset[],
  storedStorageIds: Id<"_storage">[]
) {
  const assets = []

  for (const asset of buildAssets) {
    const bytes = asset.bytes.buffer.slice(
      asset.bytes.byteOffset,
      asset.bytes.byteOffset + asset.bytes.byteLength
    ) as ArrayBuffer
    const storageId = await ctx.storage.store(
      new Blob([bytes], { type: asset.mimeType })
    )

    storedStorageIds.push(storageId)
    assets.push({
      path: asset.path,
      mimeType: asset.mimeType,
      byteSize: asset.byteSize,
      storageId,
    })
  }

  return assets
}

function validateCapabilities(capabilities: ArtifactCapabilityInput[]) {
  for (const capability of capabilities) {
    if (getToolPermission(capability.tool) === undefined) {
      throw new Error(`Unknown artifact capability tool: ${capability.tool}`)
    }
  }
}
