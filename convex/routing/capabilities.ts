import { type Doc } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { resolveUserIdByEmail } from "../identity/identities"
import { listActiveIntegrationsForOwner } from "../integrations/data"
import {
  getToolPermissionsBySurface,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
  type ToolPermission,
} from "../permissions/catalog"
import { listPermissionOverrides } from "../permissions/read"
import { getActorEmail } from "../shared/actor"
import {
  integrations as integrationCatalog,
  integrationLabels,
  type ToolSurface,
  toolSurfaceLabel,
} from "../shared/integrations"

const permissionBuckets = ["yes", "ask", "no"] as const

type PermissionBucket = (typeof permissionBuckets)[number]

const toolTerms: Record<string, string> = {
  add_automation: "add automations",
  channels_list: "channels",
  conversations_add_message: "send replies",
  conversations_history: "channels",
  conversations_replies: "threads",
  conversations_search_messages: "search",
  create_artifact: "create artifacts",
  delete_artifact: "delete artifacts",
  github_add_issue_comment: "post comments",
  github_clone_repository: "repos",
  github_get_file: "files",
  github_get_issue: "issues",
  github_get_pull_request: "PRs",
  github_get_repository: "repos",
  github_list_repositories: "repos",
  github_reply_to_pull_request_review_comment: "post comments",
  github_search_issues: "issues",
  google_calendar_create_event: "create events",
  google_calendar_get_event: "events",
  google_calendar_list_events: "events",
  google_calendar_update_event: "update events",
  google_drive_create_file: "create files",
  google_drive_get_file: "files",
  google_drive_read_file: "file content",
  google_drive_search_files: "files",
  google_drive_update_file: "update files",
  google_gmail_create_draft: "drafts",
  google_gmail_get_message: "messages",
  google_gmail_get_messages: "messages",
  google_gmail_get_thread: "threads",
  google_gmail_get_threads: "threads",
  google_gmail_reply_to_thread: "replies",
  google_gmail_search_threads: "threads",
  google_gmail_send_message: "send email",
  linear_add_comment: "add comments",
  linear_get_issue: "issues",
  linear_list_comments: "comments",
  linear_search_issues: "issues",
  list_capabilities: "capabilities",
  load_skill: "skills",
  microsoft_calendar_create_event: "create events",
  microsoft_calendar_get_event: "events",
  microsoft_calendar_list_events: "events",
  microsoft_calendar_update_event: "update events",
  microsoft_email_create_draft: "drafts",
  microsoft_email_get_message: "messages",
  microsoft_email_search_messages: "messages",
  microsoft_email_send_message: "send email",
  microsoft_email_update_message: "messages",
  notion_append_block_children: "append blocks",
  notion_create_comment: "add comments",
  notion_create_page: "create pages",
  notion_get_block_children: "page content",
  notion_get_page: "pages",
  notion_list_comments: "comments",
  notion_query_data_source: "databases",
  notion_search: "search",
  notion_update_page: "update pages",
  read_artifact: "artifacts",
  read_artifact_state: "artifact state",
  read_attachment: "attachments",
  read_automation: "automations",
  save_attachment: "save attachments",
  search_artifacts: "artifacts",
  search_attachments: "attachments",
  search_automations: "automations",
  update_artifact: "update artifacts",
  update_artifact_state: "artifact state",
  update_automation: "update automations",
  users_search: "users",
  web_fetch: "web search",
  web_search: "web search",
}

export async function createRoutingCapabilitySummary(
  ctx: QueryCtx,
  args: {
    integration: Doc<"integrations">
    message: Doc<"messages">
  }
) {
  const [ownerId, overrides] = await Promise.all([
    resolveUserIdByEmail(ctx, {
      email: getActorEmail(args.message.actor),
      tenantId: args.integration.tenantId,
    }),
    listPermissionOverrides(ctx, args.integration.tenantId),
  ])
  const integrations = await listActiveIntegrationsForOwner(ctx, {
    ownerId,
    tenantId: args.integration.tenantId,
  })

  return formatRoutingCapabilitySummary({
    integrations,
    toolModes: resolveToolModes(overrides),
  })
}

export function createRoutingCapabilityGuidance(summary: string) {
  return [
    "## Capabilities",
    "",
    "For broad capability questions, answer from the listed items. `yes` = usable now; `ask` = approval required; `no` = blocked. Route `agent` for actions or connection-specific details not listed here.",
    "",
    summary,
  ].join("\n")
}

export function formatRoutingCapabilitySummary(args: {
  integrations: Pick<Doc<"integrations">, "integration">[]
  toolModes: ReadonlyMap<string, PermissionMode>
}) {
  const connected = connectedSurfaces(args.integrations)
  const connectedToolSurfaces: ToolSurface[] = [
    "milo",
    ...integrationCatalog.filter((surface) => connected.has(surface)),
  ]
  const connectable = integrationCatalog
    .filter((integration) => !connected.has(integration))
    .map((integration) => integrationLabels[integration])

  return [
    "Connected:",
    ...connectedToolSurfaces.map((surface) =>
      connectedLine(surface, args.toolModes)
    ),
    "",
    `Connectable: ${
      connectable.length === 0 ? "None" : connectable.join(", ")
    }`,
  ].join("\n")
}

function connectedSurfaces(
  integrations: Pick<Doc<"integrations">, "integration">[]
) {
  return new Set(integrations.map((integration) => integration.integration))
}

function connectedLine(
  surface: ToolSurface,
  toolModes: ReadonlyMap<string, PermissionMode>
) {
  return [
    `- ${toolSurfaceLabel(surface)}`,
    ...permissionBuckets.flatMap((bucket) =>
      bucketPart(bucket, surface, toolModes)
    ),
  ].join(" | ")
}

function bucketPart(
  bucket: PermissionBucket,
  surface: ToolSurface,
  toolModes: ReadonlyMap<string, PermissionMode>
) {
  const terms = permissionTerms(surface, toolModes, bucket)

  return terms.length === 0 ? [] : [`${bucket}: ${terms.join(", ")}`]
}

function permissionTerms(
  surface: ToolSurface,
  toolModes: ReadonlyMap<string, PermissionMode>,
  bucket: PermissionBucket
) {
  const seen = new Set<string>()
  const terms: string[] = []

  for (const permission of getToolPermissionsBySurface(surface)) {
    if (bucketForMode(resolveToolMode(toolModes, permission.tool)) !== bucket) {
      continue
    }

    const term = toolTerm(permission)

    if (!seen.has(term)) {
      seen.add(term)
      terms.push(term)
    }
  }

  return terms
}

function bucketForMode(mode: PermissionMode): PermissionBucket {
  if (mode === "prompted") {
    return "ask"
  }

  if (mode === "blocked") {
    return "no"
  }

  return "yes"
}

function toolTerm(permission: ToolPermission) {
  return toolTerms[permission.tool] ?? permission.label.toLowerCase()
}
