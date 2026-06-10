import { type Doc } from "../../_generated/dataModel"
import {
  getToolPermissionsByProvider,
  type PermissionMode,
  resolveToolMode,
  type ToolProvider,
} from "../../permissions/catalog"
import { requireGitHubCredentials } from "../../providers/github/credentials"
import { requireGoogleCredentials } from "../../providers/google/credentials"
import { requireLinearCredentials } from "../../providers/linear/credentials"
import { requireMicrosoftCredentials } from "../../providers/microsoft/credentials"
import { requireNotionCredentials } from "../../providers/notion/credentials"
import { requireSlackCredentials } from "../../providers/slack/credentials"
import { createRuntimeToolCapability, getProviderSkillNames } from "../bundles"
import { createGitHubToolBundle } from "./github"
import { createGmailToolBundle, createGoogleCalendarToolBundle } from "./google"
import { createLinearToolBundle } from "./linear"
import {
  createMicrosoftCalendarToolBundle,
  createMicrosoftEmailToolBundle,
} from "./microsoft"
import { createMiloToolBundle } from "./milo"
import { createNotionToolBundle } from "./notion"
import { type ToolPermissionInput } from "./policy"
import { createSlackToolBundle } from "./slack"
import {
  type RuntimeToolBundle,
  type RuntimeToolCapability,
  type ToolBundle,
} from "./types"

type IntegrationBundleArgs = {
  broker: {
    convexSiteUrl: string
    executionToken: string
  }
  integration: Doc<"integrations">
  toolModes: ReadonlyMap<string, PermissionMode>
}

type IntegrationToolBundle = {
  provider: ToolProvider
  bundle: ToolBundle
  capability: RuntimeToolCapability
}

export type {
  McpServerConfig,
  RuntimeTarget,
  RuntimeToolBundle,
  SandboxFile,
  ToolBundle,
  ToolPreflight,
} from "./types"

export function assembleToolsForRun(args: {
  milo: {
    convexSiteUrl: string
    executionToken: string
  }
  integrations: Doc<"integrations">[]
  toolModes: ReadonlyMap<string, PermissionMode>
}): RuntimeToolBundle {
  const bundles: ToolBundle[] = []
  const skillNames = new Set<string>()
  const capabilities: RuntimeToolCapability[] = []
  const miloPermissions = getEnabledToolPermissions("milo", args.toolModes)

  if (miloPermissions.length > 0) {
    bundles.push(
      createMiloToolBundle({
        convexSiteUrl: args.milo.convexSiteUrl,
        executionToken: args.milo.executionToken,
        permissions: miloPermissions,
        toolModes: args.toolModes,
      })
    )
    addProviderSkillNames(skillNames, "milo")
    capabilities.push(createRuntimeToolCapability("milo", miloPermissions))
  }

  for (const integration of args.integrations) {
    const integrationBundle = createIntegrationToolBundle({
      broker: args.milo,
      integration,
      toolModes: args.toolModes,
    })

    if (integrationBundle !== null) {
      bundles.push(integrationBundle.bundle)
      addProviderSkillNames(skillNames, integrationBundle.provider)
      capabilities.push(integrationBundle.capability)
    }
  }

  return {
    mcpServers: bundles.flatMap((bundle) => bundle.mcpServers),
    sandboxFiles: bundles.flatMap((bundle) => bundle.sandboxFiles),
    preflights: bundles.flatMap((bundle) => bundle.preflights),
    promptedTools: bundles.flatMap((bundle) => bundle.promptedTools),
    skillNames: [...skillNames],
    capabilities,
  }
}

function createIntegrationToolBundle(
  args: IntegrationBundleArgs
): IntegrationToolBundle | null {
  if (args.integration.status !== "active") {
    return null
  }

  const provider = getRuntimeToolProvider(args.integration.provider)

  if (provider === null) {
    return null
  }

  const permissions = getEnabledToolPermissions(provider, args.toolModes)

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
      }
}

function addProviderSkillNames(
  skillNames: Set<string>,
  provider: ToolProvider
) {
  for (const skillName of getProviderSkillNames(provider)) {
    skillNames.add(skillName)
  }
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

function getEnabledToolPermissions(
  provider: ToolProvider,
  toolModes: ReadonlyMap<string, PermissionMode>
) {
  return getToolPermissionsByProvider(provider).filter(
    (permission) => resolveToolMode(toolModes, permission.tool) !== "blocked"
  )
}

function getRuntimeToolProvider(provider: string): ToolProvider | null {
  if (
    provider === "linear" ||
    provider === "github" ||
    provider === "slack" ||
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "notion" ||
    provider === "microsoftEmail" ||
    provider === "microsoftCalendar"
  ) {
    return provider
  }

  return null
}
