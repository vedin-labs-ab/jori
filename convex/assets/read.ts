import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { optionalString, requiredString } from "../shared/input"

export type RunAsset = {
  assetId: Id<"assets">
  name: string
  mimeType: string
  size: number
  description?: string
  bytes: Uint8Array
}

export type AssetContext = {
  ctx: ActionCtx
  run: Doc<"runs">
}

export async function readRunAssets(
  context: AssetContext | undefined,
  value: unknown,
  options: { maxBytes?: number } = {}
): Promise<RunAsset[]> {
  const inputs = readAssetInputs(value)

  if (inputs.length === 0) {
    return []
  }

  if (context === undefined) {
    throw new Error("Assets are not available in this context")
  }

  const assets: RunAsset[] = []

  for (const input of inputs) {
    const asset = await context.ctx.runQuery(
      internal.assets.data.getForTenant,
      {
        tenantId: context.run.tenantId,
        assetId: input.assetId as Id<"assets">,
      }
    )

    if (asset === null) {
      throw new Error(`Unknown asset: ${input.assetId}`)
    }

    if (options.maxBytes !== undefined && asset.size > options.maxBytes) {
      throw new Error(
        `${asset.name} exceeds the ${formatBytes(options.maxBytes)} asset limit`
      )
    }

    const blob = await context.ctx.storage.get(asset.storageId)

    if (blob === null) {
      throw new Error(`Asset is missing: ${asset.name}`)
    }

    assets.push({
      assetId: asset._id,
      name: input.name ?? asset.name,
      mimeType: input.mimeType ?? asset.mimeType,
      size: asset.size,
      description: asset.description,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    })
  }

  return assets
}

function readAssetInputs(value: unknown) {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error("assets must be an array")
  }

  return value.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`assets[${index}] must be an object`)
    }

    const input = item as Record<string, unknown>
    const assetId = requiredString(input.assetId, `assets[${index}].assetId`)

    return {
      assetId,
      name: optionalString(input.name),
      mimeType: optionalString(input.mimeType),
    }
  })
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.floor(bytes / 1024)} KB`
  }

  return `${Math.floor(bytes / (1024 * 1024))} MB`
}
