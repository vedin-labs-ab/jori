import { type Doc } from "../../_generated/dataModel"
import {
  type AccessLevel,
  type AutomationAccess,
  canUseRead,
  canUseWrite,
  getIntegrationAccess,
} from "../../automations/access"
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
import { createRuntimeToolCapability } from "../bundles"
import { createBrokeredToolBundle } from "./brokered"
import {
  type RuntimeToolCapability,
  type ToolBundle,
  type ToolPreflight,
} from "./types"

type RuntimeToolProvider = ToolPreflight["type"]

type IntegrationBundleArgs = {
  broker: {
    convexSiteUrl: string
    executionToken: string
  }
  integration: Doc<"integrations">
  access?: AutomationAccess
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

  const integrationAccess =
    args.access === undefined
      ? "both"
      : getIntegrationAccess(args.access, args.integration._id)
  const permissions = getEnabledToolPermissions(
    provider,
    args.toolModes,
    integrationAccess
  )

  if (permissions.length === 0) {
    return null
  }

  return {
    provider,
    bundle: createBrokeredToolBundle({
      broker: args.broker,
      preflight: createIntegrationPreflight(provider, args.integration),
      permissions,
      toolModes: args.toolModes,
    }),
    capability: createRuntimeToolCapability(provider, permissions),
    permissions,
  }
}

export function getEnabledToolPermissions(
  provider: ToolProvider,
  toolModes: ReadonlyMap<string, PermissionMode>,
  access: AccessLevel = "both"
) {
  return getToolPermissionsByProvider(provider).filter(
    (permission) =>
      resolveToolMode(toolModes, permission.tool) !== "blocked" &&
      isPermissionAllowedByAccess(permission.access, access)
  )
}

function isPermissionAllowedByAccess(
  permissionAccess: "read" | "write",
  access: AccessLevel
) {
  if (permissionAccess === "read") {
    return canUseRead(access)
  }

  return canUseWrite(access)
}

const runtimeToolProviders: readonly RuntimeToolProvider[] = [
  "linear",
  "github",
  "slack",
  "gmail",
  "googleCalendar",
  "googleDrive",
  "notion",
  "microsoftEmail",
  "microsoftCalendar",
]

function getRuntimeToolProvider(provider: string): RuntimeToolProvider | null {
  return (
    runtimeToolProviders.find((candidate) => candidate === provider) ?? null
  )
}

function createIntegrationPreflight(
  provider: RuntimeToolProvider,
  integration: Doc<"integrations">
): ToolPreflight {
  switch (provider) {
    case "linear":
      return {
        type: "linear",
        credentials: requireLinearCredentials(integration),
      }
    case "github":
      return {
        type: "github",
        credentials: requireGitHubRuntimeCredentials(integration),
      }
    case "slack":
      return {
        type: "slack",
        credentials: requireSlackCredentials(integration),
      }
    case "gmail":
    case "googleCalendar":
    case "googleDrive":
      return {
        type: provider,
        credentials: requireGoogleCredentials(integration),
      }
    case "notion":
      return {
        type: "notion",
        credentials: requireNotionCredentials(integration),
      }
    case "microsoftEmail":
    case "microsoftCalendar":
      return {
        type: provider,
        credentials: requireMicrosoftCredentials(integration),
      }
  }
}

function requireGitHubRuntimeCredentials(integration: Doc<"integrations">) {
  const credentials = requireGitHubCredentials(integration)

  if (credentials.tokens?.access === undefined) {
    throw new Error("Missing GitHub runtime token")
  }

  return credentials
}
