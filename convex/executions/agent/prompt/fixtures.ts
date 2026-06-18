import { type ToolPermission } from "../../../permissions/catalog"
import { type assemblePrompt } from "."
import { promptIntegration } from "./integration"

export function automationRuntimeInput(webSearch = true) {
  const github = promptIntegration("github")
  const slack = promptIntegration("slack")

  return {
    type: "automation",
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      automationId: "automation",
      reason: {
        type: "time",
        scheduledAt: Date.UTC(2026, 5, 12, 9),
      },
      createdAt: 0,
    },
    integration: null,
    integrations: [github, slack],
    automation: {
      _id: "automation",
      _creationTime: 0,
      tenantId: "tenant",
      name: "Daily digest",
      instructions: "Post the daily digest.",
      type: "cron",
      access: {
        integrations: [
          { integrationId: github._id, tools: ["github_get_issue"] },
          { integrationId: slack._id, tools: ["conversations_add_message"] },
        ],
        web: webSearch,
      },
      trigger: {
        type: "cron",
        cron: "0 9 * * *",
        nextAt: Date.UTC(2026, 5, 13, 9),
      },
      status: "active",
      createdAt: 0,
      updatedAt: 0,
    },
    event: null,
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

export function linearAutomationRuntimeInput() {
  const linear = promptIntegration("linear")

  return {
    type: "automation",
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      automationId: "automation",
      reason: { type: "event", eventId: "event" },
      createdAt: 0,
    },
    integration: linear,
    integrations: [linear],
    automation: {
      _id: "automation",
      _creationTime: 0,
      tenantId: "tenant",
      name: "Linear quip",
      instructions: "Reply with a short quip.",
      type: "event",
      access: {
        integrations: [
          { integrationId: linear._id, tools: ["linear_add_comment"] },
        ],
        web: true,
      },
      trigger: {
        type: "event",
        integrationId: linear._id,
        event: "issue.comment.edited",
        criteria: { team: "team-id" },
      },
      status: "active",
      createdAt: 0,
      updatedAt: 0,
    },
    event: {
      _id: "event",
      _creationTime: 0,
      tenantId: "tenant",
      integrationId: linear._id,
      key: "linear:delivery",
      type: "issue.comment.edited",
      criteria: { issue: "issue-id", team: "team-id" },
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
      createdAt: 0,
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

export function notionAutomationRuntimeInput() {
  const notion = promptIntegration("notion")

  return {
    type: "automation",
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      automationId: "automation",
      reason: {
        type: "event",
        eventId: "event",
      },
      createdAt: 0,
    },
    integration: notion,
    integrations: [notion],
    automation: {
      _id: "automation",
      _creationTime: 0,
      tenantId: "tenant",
      name: "Notion follow-up",
      instructions: "Summarize the changed Notion page.",
      type: "event",
      access: {
        integrations: [
          {
            integrationId: notion._id,
            tools: ["notion_search", "notion_create_page"],
          },
        ],
        web: false,
      },
      trigger: {
        type: "event",
        integrationId: notion._id,
        event: "comment.created",
        criteria: { page: "page-id" },
      },
      status: "active",
      createdAt: 0,
      updatedAt: 0,
    },
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
    criteria: { page: "page-id" },
    data: {
      pageId: "page-id",
      commentId: "comment-id",
      notionEventId: "notion-event-id",
      notionEventType: "comment.created",
      entity: { id: "comment-id", type: "comment" },
      parent: { id: "block-id", type: "block" },
    },
    createdAt: 0,
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
      reason: {
        type: "message",
        messageId: "message",
        kind: "mention",
      },
      createdAt: 0,
    },
    integration: promptIntegration(integration),
    integrations: [promptIntegration(integration)],
    message: {
      _id: "message",
      _creationTime: 0,
      tenantId: "tenant",
      integrationId: `${integration}-integration`,
      externalId: "external-message",
      conversationId: "conversation",
      actorId: "actor",
      text: "Please help.",
      data,
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
    access: "write",
    defaultMode: "prompted",
  }
}

export function approvalContinuation(
  decision: "approved" | "denied" = "approved"
) {
  return {
    decision,
    handoff: {
      objective: "Create the calendar event and confirm it in Slack.",
      progress: "Found a time that works for the attendees.",
      next: "Tell the Slack thread the event was created.",
    },
    action: {
      surface: "googleCalendar",
      tool: "google_calendar_create_event",
      summary: "Create a 30 minute design review.",
      args: { title: "Design review" },
    },
    result:
      decision === "approved"
        ? { eventId: "event-123" }
        : {
            error: {
              code: "approval_denied",
              message: "The user denied approval for this action.",
            },
          },
  }
}
