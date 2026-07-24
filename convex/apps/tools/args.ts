import { isRecord } from "../../../contracts/json"
import { type Id } from "../../_generated/dataModel"
import {
  optionalString,
  requiredRawString,
  requiredString,
} from "../../shared/input"

export { readRecord as normalizeToolArgs } from "../../shared/input"

export function requiredAppId(value: unknown) {
  return requiredString(value, "appId") as Id<"apps">
}

export function normalizeAccess(value: unknown) {
  return value === "organization" ? "organization" : "personal"
}

export function normalizeSource(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("source is required")
  }

  return value.map((file) => {
    if (typeof file !== "object" || file === null || Array.isArray(file)) {
      throw new Error("source files must be objects")
    }

    const record = file as Record<string, unknown>

    return {
      path: requiredString(record.path, "source.path"),
      content: requiredRawString(record.content, "source.content"),
      executable: record.executable === true,
    }
  })
}

export function normalizeCapabilities(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((capability) => {
    if (!isRecord(capability)) {
      throw new Error("capabilities must be objects")
    }

    return {
      tool: requiredString(capability.tool, "capabilities.tool"),
      integrationId: optionalString(capability.integrationId) as
        | Id<"integrations">
        | undefined,
      versionPinned: capability.versionPinned === true,
    }
  })
}

export function normalizeBuild(value: unknown) {
  if (!isRecord(value)) {
    throw new Error(
      "App source must be validated by the Milo app builder before publishing."
    )
  }

  if (!Array.isArray(value.assets)) {
    throw new Error("App build assets are required.")
  }

  return {
    sourceHash: requiredString(value.sourceHash, "build.sourceHash"),
    assets: value.assets.map(normalizeBuildAsset),
  }
}

function normalizeBuildAsset(asset: unknown) {
  if (!isRecord(asset)) {
    throw new Error("App build assets must be objects.")
  }

  return {
    path: requiredString(asset.path, "build.assets.path"),
    mimeType: requiredString(asset.mimeType, "build.assets.mimeType"),
    contentBase64: requiredString(
      asset.contentBase64,
      "build.assets.contentBase64"
    ),
  }
}
