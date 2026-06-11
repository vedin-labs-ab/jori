import { type Doc } from "../../_generated/dataModel"
import {
  getToolPermissionsByProvider,
  type PermissionMode,
  resolveToolMode,
  type ToolPermission,
  type ToolProvider,
} from "../../permissions/catalog"
import { requireGitHubCredentials } from "../../providers/github/credentials"
import { requireGoogleCredentials } from "../../providers/google/credentials"
import { requireLinearCredentials } from "../../providers/linear/credentials"
import { requireMicrosoftCredentials } from "../../providers/microsoft/credentials"
import { requireNotionCredentials } from "../../providers/notion/credentials"
import { requireSlackCredentials } from "../../providers/slack/credentials"
import {
  canRead,
  canWrite,
  getScheduleProviderAccess,
  type ScheduleOutput,
  type ScheduleSurfaceAccess,
} from "../../scheduling/output"
import { createRuntimeToolCapability } from "../bundles"
import { createGitHubToolBundle } from "./github"
import {
  createGmailToolBundle,
  createGoogleCalendarToolBundle,
  createGoogleDriveToolBundle,
} from "./google"
import { createLinearToolBundle } from "./linear"
import {
  createMicrosoftCalendarToolBundle,
  createMicrosoftEmailToolBundle,
} from "./microsoft"
import { createNotionToolBundle } from "./notion"
import { type ToolPermissionInput } from "./policy"
import { createSlackToolBundle } from "./slack"
import { type RuntimeToolCapability, type ToolBundle } from "./types"

type IntegrationBundleArgs = {
  broker: {
    convexSiteUrl: string
    executionToken: string
  }
  integration: Doc<"integrations">
  scheduleOutput?: ScheduleOutput
  toolModes: ReadonlyMap<string, PermissionMode>
}

type IntegrationToolBundle = {
  provider: ToolProvider
  bundle: ToolBundle
  capability: RuntimeToolCapability
  permissions: ToolPermission[]
}

export function createIntegrationToolBundle(
  args: IntegrationBundleArgs
): IntegrationToolBundle | null {
  if (args.integration.status !== "active") {
    return null
  }

  const provider = getRuntimeToolProvider(args.integration.provider)

  if (provider === null) {
    return null
  }

  const providerAccess =
    args.scheduleOutput === undefined
      ? "both"
      : getScheduleProviderAccess(
          args.scheduleOutput,
          args.integration.provider
        )
  const permissions = getEnabledToolPermissions(
    provider,
    args.toolModes,
    providerAccess
  )

  if (permissions.length === 0) {
    return null
  }

  const permissionInput: ToolPermissionInput = {
    permissions,
    toolModes: args.toolModes,
  }

  const bundle = createProviderToolBundle(args, permissionInput)

  return bundle === null
    ? null
    : {
        provider,
        bundle,
        capability: createRuntimeToolCapability(provider, permissions),
        permissions,
      }
}

export function getEnabledToolPermissions(
  provider: ToolProvider,
  toolModes: ReadonlyMap<string, PermissionMode>,
  access: ScheduleSurfaceAccess | "none" = "both"
) {
  return getToolPermissionsByProvider(provider).filter(
    (permission) =>
      resolveToolMode(toolModes, permission.tool) !== "blocked" &&
      isPermissionAllowedByAccess(permission.access, access)
  )
}

function isPermissionAllowedByAccess(
  permissionAccess: "read" | "write",
  access: ScheduleSurfaceAccess | "none"
) {
  if (permissionAccess === "read") {
    return canRead(access)
  }

  return canWrite(access)
}

function createProviderToolBundle(
  args: IntegrationBundleArgs,
  permissionInput: ToolPermissionInput
) {
  switch (args.integration.provider) {
    case "linear":
      return createLinearIntegrationToolBundle(args, permissionInput)
    case "github":
      return createGitHubIntegrationToolBundle(args, permissionInput)
    case "slack":
      return createSlackIntegrationToolBundle(args, permissionInput)
    case "gmail":
      return createGmailIntegrationToolBundle(args, permissionInput)
    case "googleCalendar":
      return createGoogleCalendarToolBundle({
        broker: args.broker,
        credentials: requireGoogleCredentials(args.integration),
        ...permissionInput,
      })
    case "googleDrive":
      return createGoogleDriveToolBundle({
        broker: args.broker,
        credentials: requireGoogleCredentials(args.integration),
        ...permissionInput,
      })
    case "notion":
      return createNotionToolBundle({
        broker: args.broker,
        credentials: requireNotionCredentials(args.integration),
        ...permissionInput,
      })
    case "microsoftEmail":
      return createMicrosoftEmailToolBundle({
        broker: args.broker,
        credentials: requireMicrosoftCredentials(args.integration),
        ...permissionInput,
      })
    case "microsoftCalendar":
      return createMicrosoftCalendarToolBundle({
        broker: args.broker,
        credentials: requireMicrosoftCredentials(args.integration),
        ...permissionInput,
      })
    default:
      return null
  }
}

function createLinearIntegrationToolBundle(
  args: IntegrationBundleArgs,
  permissionInput: ToolPermissionInput
) {
  return createLinearToolBundle({
    broker: args.broker,
    credentials: requireLinearCredentials(args.integration),
    ...permissionInput,
  })
}

function createGitHubIntegrationToolBundle(
  args: IntegrationBundleArgs,
  permissionInput: ToolPermissionInput
) {
  return createGitHubToolBundle({
    broker: args.broker,
    credentials: requireGitHubCredentials(args.integration),
    ...permissionInput,
  })
}

function createSlackIntegrationToolBundle(
  args: IntegrationBundleArgs,
  permissionInput: ToolPermissionInput
) {
  return createSlackToolBundle({
    accountId: requireIntegrationExternalId(args.integration),
    broker: args.broker,
    credentials: requireSlackCredentials(args.integration),
    ...permissionInput,
  })
}

function createGmailIntegrationToolBundle(
  args: IntegrationBundleArgs,
  permissionInput: ToolPermissionInput
) {
  return createGmailToolBundle({
    accountEmail: requireIntegrationEmail(args.integration),
    broker: args.broker,
    credentials: requireGoogleCredentials(args.integration),
    ...permissionInput,
  })
}

function requireIntegrationExternalId(integration: Doc<"integrations">) {
  if (integration.externalId !== undefined) {
    return integration.externalId
  }

  throw new Error(`${integration.provider} integration is missing external ID`)
}

function requireIntegrationEmail(integration: Doc<"integrations">) {
  if (integration.email !== undefined) {
    return integration.email
  }

  throw new Error(`${integration.provider} integration is missing email`)
}

function getRuntimeToolProvider(provider: string): ToolProvider | null {
  if (
    provider === "linear" ||
    provider === "github" ||
    provider === "slack" ||
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "googleDrive" ||
    provider === "notion" ||
    provider === "microsoftEmail" ||
    provider === "microsoftCalendar"
  ) {
    return provider
  }

  return null
}
