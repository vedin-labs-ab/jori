import { type ToolPermission } from "../../contracts/permissions"
import { type RuntimeIntegration } from "../../convex/runs/agent/input"
import { type assemblePrompt } from "../../convex/runs/agent/prompt"

export function automationRuntimeInput(webSearch = true) {
  const github = promptIntegration("github")
  const slack = promptIntegration("slack")

  return {
    type: "automation",
    instructions: "Post the daily digest.",
    access: {
      integrations: [
        { id: github._id, tools: ["github_get_issue"] },
        { id: slack._id, tools: ["conversations_add_message"] },
      ],
      web: webSearch,
    },
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      automationId: "automation",
      snapshot: {
        title: "Daily digest",
        source: { type: "automation" },
        context: [],
      },
      cause: {
        type: "time",
        scheduledAt: Date.UTC(2026, 5, 12, 9),
      },
      createdAt: 0,
    },
    integration: null,
    integrations: [github, slack],
    event: null,
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

export function linearAutomationRuntimeInput() {
  const linear = promptIntegration("linear")

  return {
    type: "automation",
    instructions: "Reply with a short quip.",
    access: {
      integrations: [{ id: linear._id, tools: ["linear_add_comment"] }],
      web: true,
    },
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      automationId: "automation",
      snapshot: {
        title: "Linear quip",
        source: { type: "event", surface: "linear" },
        context: [],
      },
      cause: { type: "event", eventId: "event" },
      createdAt: 0,
    },
    integration: linear,
    integrations: [linear],
    event: {
      _id: "event",
      _creationTime: 0,
      tenantId: "tenant",
      integrationId: linear._id,
      key: "linear:delivery",
      type: "issue.comment.edited",
      match: { issue: "issue-id", team: "team-id" },
      text: "i wonder if this is worth spending time on",
      data: {
        issueId: "issue-id",
        issueIdentifier: "VED-1",
        issue: {
          title: "Get familiar with Linear",
          url: "https://linear.app/acme/issue/VED-1/get-familiar",
        },
        commentId: "comment-id",
        url: "https://linear.app/acme/issue/VED-1/get-familiar#comment-id",
      },
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

export function notionAutomationRuntimeInput() {
  const notion = promptIntegration("notion")

  return {
    type: "automation",
    instructions: "Summarize the changed Notion page.",
    access: {
      integrations: [
        {
          id: notion._id,
          tools: ["notion_search", "notion_create_page"],
        },
      ],
      web: false,
    },
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      automationId: "automation",
      snapshot: {
        title: "Notion follow-up",
        source: { type: "event", surface: "notion" },
        context: [],
      },
      cause: {
        type: "event",
        eventId: "event",
      },
      createdAt: 0,
    },
    integration: notion,
    integrations: [notion],
    event: notionCommentEvent(notion._id),
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

function notionCommentEvent(integrationId: string) {
  return {
    _id: "event",
    _creationTime: 0,
    tenantId: "tenant",
    integrationId,
    key: "notion:workspace:event",
    type: "comment.created",
    match: { page: "page-id" },
    data: {
      pageId: "page-id",
      commentId: "comment-id",
      workspaceId: "workspace-id",
      notionEventId: "notion-event-id",
      notionEventType: "comment.created",
      entity: { id: "comment-id", type: "comment" },
      parent: { id: "block-id", type: "block" },
    },
  }
}

export function runtimeInput(
  integration: "github" | "linear" | "slack",
  data: unknown
) {
  return {
    type: "message",
    messageIntegration: integration,
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      cause: {
        type: "message",
        messageId: "message",
        kind: "mention",
      },
      createdAt: 0,
    },
    integration: promptIntegration(integration),
    integrations: [promptIntegration(integration)],
    conversation: { entries: [], hasMoreMessages: false },
    place: null,
    message: {
      _id: "message",
      _creationTime: 0,
      tenantId: "tenant",
      integrationId: `${integration}-integration`,
      integration,
      externalId: "external-message",
      conversationId: "conversation",
      type: "message.channels",
      mentioned: true,
      actor: {
        externalId: "UACTOR",
        kind: "person",
        name: "Albin Vedin",
      },
      text: "Please help.",
      data,
      observedAt: 1_000,
      createdAt: 0,
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

export function promptedTool(): ToolPermission {
  return {
    surface: "notion",
    tool: "notion_create_page",
    label: "Create Notion page",
    description: "Create a Notion page or database record.",
    usage:
      "Create a Notion page or database record. Confirm the parent and properties before creating.",
    route: "broker",
    access: "write",
    defaultMode: "prompted",
  }
}

function promptIntegration(integration: string): RuntimeIntegration {
  return {
    _id: `${integration}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    integration,
    scope: "tenant",
    externalId: `${integration}-account`,
    credentials: {},
    data: integration === "slack" ? { botUserId: "UBOT" } : {},
    status: "active",
    createdBy: "person",
    createdAt: 0,
    updatedAt: 0,
  } as RuntimeIntegration
}
