import { type Doc } from "../../../_generated/dataModel"
import {
  type AutomationAccess,
  getIntegrationTools,
} from "../../../automations/access"
import {
  getToolPermissionsBySurface,
  type PermissionMode,
  type ToolPermission,
  type ToolSurface,
} from "../../../permissions/catalog"
import { requireGitHubCredentials } from "../../../providers/github/credentials"
import { requireGoogleCredentials } from "../../../providers/google/credentials"
import { requireLinearCredentials } from "../../../providers/linear/credentials"
import { requireMicrosoftCredentials } from "../../../providers/microsoft/credentials"
import { requireNotionCredentials } from "../../../providers/notion/credentials"
import { requireSlackCredentials } from "../../../providers/slack/credentials"
import { createBrokeredToolBundle } from "./brokered"
import { createRuntimeToolCapability } from "./bundles"
import { canUseToolPermission, type ToolExecutionType } from "./policy"
import {
  type RuntimeToolCapability,
  type ToolBundle,
  type ToolPreflight,
} from "./types"

type RuntimeToolSurface = ToolPreflight["type"]

type IntegrationBundleArgs = {
  broker: {
    convexSiteUrl: string
    executionToken: string
  }
  executionType: ToolExecutionType
  integration: Doc<"integrations">
  access?: AutomationAccess
  toolModes: ReadonlyMap<string, PermissionMode>
}

type IntegrationToolBundle = {
  provider: ToolSurface
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

  const provider = getRuntimeToolSurface(args.integration.provider)

  if (provider === null) {
    return null
  }

  const integrationAccess =
    args.access === undefined
      ? undefined
      : getIntegrationTools(args.access, args.integration._id)
  const permissions = getEnabledToolPermissions(
    provider,
    args.toolModes,
    args.executionType,
    integrationAccess
  )

  if (permissions.length === 0) {
    return null
  }

  return {
    provider,
    bundle: createBrokeredToolBundle({
      broker: args.broker,
      executionType: args.executionType,
      preflight: createIntegrationPreflight(provider, args.integration),
      permissions,
      toolModes: args.toolModes,
    }),
    capability: createRuntimeToolCapability(
      provider,
      permissions,
      args.toolModes
    ),
    permissions,
  }
}

export function getEnabledToolPermissions(
  provider: ToolSurface,
  toolModes: ReadonlyMap<string, PermissionMode>,
  executionType: ToolExecutionType = "message",
  selectedTools?: readonly string[]
) {
  const selectedToolSet =
    selectedTools === undefined ? null : new Set(selectedTools)

  return getToolPermissionsBySurface(provider).filter(
    (permission) =>
      (selectedToolSet === null || selectedToolSet.has(permission.tool)) &&
      canUseToolPermission({ executionType, permission, toolModes })
  )
}

const runtimeToolSurfaces: readonly RuntimeToolSurface[] = [
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

function getRuntimeToolSurface(provider: string): RuntimeToolSurface | null {
  return runtimeToolSurfaces.find((candidate) => candidate === provider) ?? null
}

function createIntegrationPreflight(
  provider: RuntimeToolSurface,
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
