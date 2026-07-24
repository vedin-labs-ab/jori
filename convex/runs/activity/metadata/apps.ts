import { clampShareExpiryHours } from "../../../../contracts/apps/share"
import { optionalNumber, optionalString } from "../../../shared/input"
import { item } from "../helpers"

type AppMetadataArgs = {
  appTitles: ReadonlyMap<string, string>
  input: Record<string, unknown> | undefined
  runAppId: string | undefined
  tool: string
}

export function appMetadata(args: AppMetadataArgs) {
  const appId = activityAppId(args.tool, args.input, args.runAppId)

  if (appId === undefined) {
    return []
  }

  const appTitle = args.appTitles.get(appId) ?? appId

  if (isAppStateTool(args.tool)) {
    return [
      item("target", appTitle),
      item("scope", optionalString(args.input?.contractName)),
    ]
  }

  return [
    item("target", appTitle),
    item("scope", shareDurationLabel(args.input?.expiresInHours)),
  ]
}

export function activityAppId(
  tool: string | undefined,
  input: Record<string, unknown> | undefined,
  runAppId: string | undefined
) {
  if (!isAppStateTool(tool) && tool !== "share_app") {
    return undefined
  }

  return (
    optionalString(input?.appId) ??
    (isAppStateTool(tool) ? runAppId : undefined)
  )
}

function isAppStateTool(tool: string | undefined) {
  return tool === "read_app_state" || tool === "update_app_state"
}

function shareDurationLabel(value: unknown) {
  const hours = clampShareExpiryHours(optionalNumber(value))

  return `${hours}h link`
}
