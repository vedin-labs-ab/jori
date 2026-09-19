import { getToolPermission } from "../../contracts/permissions"

type IntegrationDoc =
  import("../../convex/_generated/dataModel").Doc<"integrations">
type PersonId = import("../../convex/_generated/dataModel").Id<"persons">

export function integration(integration: string): IntegrationDoc {
  return {
    _id: `${integration}-integration`,
    _creationTime: 0,
    organizationId: "organization",
    integration,
    scope: isUserScopedIntegration(integration) ? "user" : "organization",
    ownerId: isUserScopedIntegration(integration)
      ? ("person" as PersonId)
      : undefined,
    externalId: `${integration}-account`,
    email: isUserScopedIntegration(integration)
      ? "user@example.com"
      : undefined,
    credentials: credentials(integration),
    status: "active",
    createdBy: "person" as PersonId,
    createdAt: 0,
    updatedAt: 0,
  } as IntegrationDoc
}

function isUserScopedIntegration(integration: string) {
  return (
    integration === "gmail" ||
    integration === "googleCalendar" ||
    integration === "microsoftEmail" ||
    integration === "microsoftCalendar"
  )
}

function credentials(integration: string) {
  if (integration === "github") {
    return {
      installationId: "123",
      tokens: { access: "github-token" },
      expiresAt: Date.now() + 60_000,
    }
  }

  if (integration === "slack") {
    return { bot: "bot-token", user: "user-token" }
  }

  if (integration === "microsoftEmail" || integration === "microsoftCalendar") {
    return {
      tokens: { access: "access-token", refresh: "refresh-token" },
      expiresAt: Date.now() + 60_000,
      tenantId: "microsoft-tenant",
    }
  }

  return {
    tokens: { access: "access-token", refresh: "refresh-token" },
    expiresAt: Date.now() + 60_000,
  }
}

type ToolAccess = "read" | "write"

/** A tool as the catalog describes it, with the approval mark when its
 *  access is the one that needs approving. */
export function catalogTool(
  tool: string,
  access: ToolAccess,
  approvalAccess?: ToolAccess
) {
  const permission = getToolPermission(tool)

  if (permission === undefined) {
    throw new Error(`Missing permission: ${tool}`)
  }

  return {
    access,
    description: permission.description,
    label: permission.label,
    ...(approvalAccess === access ? { requiresApproval: true } : {}),
    tool,
  }
}

/** The two Slack tools as a run's prepared snapshot stores them. */
export function slackSnapshotTools(approvalAccess?: ToolAccess) {
  return [
    {
      access: "write" as const,
      description: "Post a Slack message.",
      label: "Send message",
      ...(approvalAccess === "write" ? { requiresApproval: true } : {}),
      tool: "conversations_add_message",
    },
    {
      access: "read" as const,
      description: "Read Slack channel messages.",
      label: "Read channel history",
      ...(approvalAccess === "read" ? { requiresApproval: true } : {}),
      tool: "conversations_history",
    },
  ]
}

/** The same two tools as the console shows them. */
export function slackDisplayTools(approvalAccess?: ToolAccess) {
  return [
    catalogTool("conversations_add_message", "write", approvalAccess),
    catalogTool("conversations_history", "read", approvalAccess),
  ]
}

export function slackToolSnapshot(approvalAccess?: ToolAccess) {
  return {
    groups: [
      {
        surface: "slack",
        label: "Slack",
        tools: slackSnapshotTools(approvalAccess),
      },
    ],
  }
}
