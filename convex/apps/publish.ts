"use node"

import { normalizeAppContract } from "../../contracts/apps/contract"
import { type AppSourceFile, appEntrypoint } from "../../contracts/apps/source"
import { getToolPermission } from "../../contracts/permissions"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type AppConsoleLink, appConsoleLink } from "./serve/urls"
import { createAppSourceSnapshot, type StoredAppBlob } from "./source"
import {
  type AppBuildInput,
  type BuildAsset,
  validateAppBuild,
} from "./source/build"

type PublishedVersion = {
  appId: Id<"apps">
  versionId: Id<"appVersions">
}

export type PublishResult = PublishedVersion & AppConsoleLink

export type SourceReadResult = {
  appId: Id<"apps">
  files: Array<{
    path: string
    content: string
    blobId: string
    mimeType: string
    byteSize: number
  }>
} | null

/** Provenance for a version published from a template; `canonical` claims
 *  the one playbook-provisioned instance per partition (create mode only). */
export type AppTemplateInput = {
  key: string
  version: number
  canonical?: boolean
}

export type PublishAppArgs =
  | {
      mode: "create"
      organizationId: string
      title: string
      access: "personal" | "organization"
      contract?: unknown
      source: AppSourceFile[]
      build: AppBuildInput
      personId: Id<"persons">
      message?: string
      capabilities?: AppCapabilityInput[]
      template?: AppTemplateInput
    }
  | {
      mode: "update"
      organizationId: string
      appId: Id<"apps">
      title: string
      access: "personal" | "organization"
      contract?: unknown
      source: AppSourceFile[]
      build: AppBuildInput
      personId: Id<"persons">
      message?: string
      capabilities?: AppCapabilityInput[]
      template?: Omit<AppTemplateInput, "canonical">
    }

type AppCapabilityInput = {
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

export async function publishApp(
  ctx: ActionCtx,
  args: PublishAppArgs
): Promise<PublishResult> {
  validateCapabilities(args.capabilities ?? [])

  const snapshot = createAppSourceSnapshot(args.source)
  const buildAssets = validateAppBuild(snapshot.files, args.build)
  const storedStorageIds: Id<"_storage">[] = []

  try {
    const blobs = await storeSourceBlobs(ctx, snapshot, storedStorageIds)
    const assets = await storeBuildAssets(ctx, buildAssets, storedStorageIds)
    const contract = normalizeAppContract(args.contract)
    const common = {
      organizationId: args.organizationId,
      title: args.title,
      access: args.access,
      contract,
      treeId: snapshot.treeId,
      trees: snapshot.trees,
      blobs,
      assets,
      entrypoint: appEntrypoint,
      sdk: "milo-app-sdk@0",
      message: args.message,
      capabilities: args.capabilities ?? [],
      ...(args.template === undefined
        ? {}
        : {
            template: {
              key: args.template.key,
              version: args.template.version,
            },
          }),
    }

    const published =
      args.mode === "create"
        ? await ctx.runMutation(internal.apps.records.publishCreated, {
            ...common,
            ownerId: args.personId,
            canonical: args.template?.canonical,
          })
        : await ctx.runMutation(internal.apps.records.publishUpdated, {
            ...common,
            appId: args.appId,
            updatedBy: args.personId,
          })

    return {
      ...published,
      ...appConsoleLink(published.appId),
    }
  } catch (error) {
    await Promise.allSettled(
      storedStorageIds.map((id) => ctx.storage.delete(id))
    )
    throw error
  }
}

export async function readAppSource(
  ctx: ActionCtx,
  args: {
    organizationId: string
    appId: Id<"apps">
    versionId?: Id<"appVersions">
  }
): Promise<SourceReadResult> {
  const files: SourceFileRecord[] | null = await ctx.runQuery(
    internal.apps.queries.listSourceFiles,
    args
  )

  if (files === null) {
    return null
  }

  return {
    appId: args.appId,
    files: await Promise.all(
      files.map(async (file) => {
        const blob = await ctx.storage.get(file.storageId)

        if (blob === null) {
          throw new Error(`App source blob is missing: ${file.path}`)
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
  snapshot: ReturnType<typeof createAppSourceSnapshot>,
  storedStorageIds: Id<"_storage">[]
) {
  const existingIds = new Set(
    await ctx.runQuery(internal.apps.queries.getExistingBlobIds, {
      ids: snapshot.files.map((file) => file.id),
    })
  )
  const blobs: StoredAppBlob[] = []

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

function validateCapabilities(capabilities: AppCapabilityInput[]) {
  for (const capability of capabilities) {
    if (getToolPermission(capability.tool) === undefined) {
      throw new Error(`Unknown app capability tool: ${capability.tool}`)
    }
  }
}
