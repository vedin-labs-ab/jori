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
import { requireSlackCredentials } from "../../providers/slack/credentials"
import { getProviderSkillNames } from "../bundles"
import { createGitHubToolBundle } from "./github"
import { createGmailToolBundle, createGoogleCalendarToolBundle } from "./google"
import { createLinearToolBundle } from "./linear"
import {
  createMicrosoftCalendarToolBundle,
  createMicrosoftEmailToolBundle,
} from "./microsoft"
import { createMiloToolBundle } from "./milo"
import { type ToolPermissionInput } from "./policy"
import { createSlackToolBundle } from "./slack"
import {
  type RuntimeTarget,
  type RuntimeToolBundle,
  type ToolBundle,
} from "./types"

type IntegrationBundleArgs = {
  integration: Doc<"integrations">
  target: RuntimeTarget
  toolModes: ReadonlyMap<string, PermissionMode>
}

type IntegrationToolBundle = {
  provider: ToolProvider
  bundle: ToolBundle
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
  target: RuntimeTarget
}): RuntimeToolBundle {
  const bundles: ToolBundle[] = []
  const skillNames = new Set<string>()
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
  }

  for (const integration of args.integrations) {
    const integrationBundle = createIntegrationToolBundle({
      integration,
      target: args.target,
      toolModes: args.toolModes,
    })

    if (integrationBundle !== null) {
      bundles.push(integrationBundle.bundle)
      addProviderSkillNames(skillNames, integrationBundle.provider)
    }
  }

  return {
    mcpServers: bundles.flatMap((bundle) => bundle.mcpServers),
    sandboxFiles: bundles.flatMap((bundle) => bundle.sandboxFiles),
    preflights: bundles.flatMap((bundle) => bundle.preflights),
    promptedTools: bundles.flatMap((bundle) => bundle.promptedTools),
    skillNames: [...skillNames],
  }
}

function createIntegrationToolBundle(
  args: IntegrationBundleArgs
): IntegrationToolBundle | null {
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

  return bundle === null ? null : { provider, bundle }
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
        credentials: requireGoogleCredentials(args.integration),
        ...permissionInput,
      })
    case "microsoftEmail":
      return createMicrosoftEmailToolBundle({
        credentials: requireMicrosoftCredentials(args.integration),
        ...permissionInput,
      })
    case "microsoftCalendar":
      return createMicrosoftCalendarToolBundle({
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
    credentials: requireLinearCredentials(args.integration),
    defaultIssueId:
      args.target.provider === "linear" ? args.target.issueId : undefined,
    ...permissionInput,
  })
}

function createGitHubIntegrationToolBundle(
  args: IntegrationBundleArgs,
  permissionInput: ToolPermissionInput
) {
  if (args.target.provider !== "github") {
    return null
  }

  return createGitHubToolBundle({
    credentials: requireGitHubCredentials(args.integration),
    owner: args.target.owner,
    repo: args.target.repo,
    issueNumber: args.target.issueNumber,
    pullNumber: args.target.pullNumber,
    commentId: args.target.commentId,
    commentKind: args.target.commentKind,
    ...permissionInput,
  })
}

function createSlackIntegrationToolBundle(
  args: IntegrationBundleArgs,
  permissionInput: ToolPermissionInput
) {
  return createSlackToolBundle({
    accountId: args.integration.accountId,
    credentials: requireSlackCredentials(args.integration),
    ...permissionInput,
  })
}

function createGmailIntegrationToolBundle(
  args: IntegrationBundleArgs,
  permissionInput: ToolPermissionInput
) {
  return createGmailToolBundle({
    accountEmail: args.integration.accountId,
    credentials: requireGoogleCredentials(args.integration),
    ...permissionInput,
  })
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
    provider === "microsoftEmail" ||
    provider === "microsoftCalendar"
  ) {
    return provider
  }

  return null
}
