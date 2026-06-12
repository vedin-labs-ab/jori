import { type Doc } from "../_generated/dataModel"
import { type ToolPermission } from "../permissions/catalog"
import { type assemblePrompt } from "./prompt"

export function automationRuntimeInput(
  readScope: "all" | string[] = [githubId()],
  webSearch = true
) {
  const github = integration("github")
  const slack = integration("slack")

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
      metadata: { source: "daily" },
      access: {
        read: readScope,
        write: [slack._id],
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
  const linear = integration("linear")

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
    integration: linear,
    integrations: [linear],
    automation: {
      _id: "automation",
      _creationTime: 0,
      tenantId: "tenant",
      name: "Linear quip",
      instructions: "Reply with a short quip.",
      access: {
        read: "all",
        write: [linear._id],
        web: true,
      },
      trigger: {
        type: "event",
        integrationId: linear._id,
        event: "issue.comment.changed",
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
      type: "issue.comment.changed",
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

export function runtimeInput(
  provider: "github" | "linear" | "slack",
  data: unknown
) {
  return {
    type: "message",
    provider,
    run: {
      _id: "run",
      _creationTime: 0,
      tenantId: "tenant",
      reason: {
        type: "message",
        messageId: "message",
      },
      createdAt: 0,
    },
    integration: integration(provider),
    integrations: [integration(provider)],
    message: {
      _id: "message",
      _creationTime: 0,
      tenantId: "tenant",
      integrationId: `${provider}-integration`,
      externalId: "external-message",
      conversationId: "conversation",
      actorId: "actor",
      text: "Please help.",
      data,
      createdAt: 0,
    },
  } as unknown as Parameters<typeof assemblePrompt>[0]
}

export function githubId() {
  return "github-integration"
}

export function promptedTool(): ToolPermission {
  return {
    provider: "notion",
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
      provider: "googleCalendar",
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

function integration(provider: string): Doc<"integrations"> {
  return {
    _id: `${provider}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    provider,
    scope: "tenant",
    externalId: `${provider}-account`,
    credentials: {},
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
