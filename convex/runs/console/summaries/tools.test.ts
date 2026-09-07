import { expect, test } from "vitest"
import {
  eventJobDisplay,
  fakeQueryCtx,
  messageDisplay,
  preparedTraceRows,
  testRun,
} from "../../../../test/convex/console"
import { slackIntegration } from "../../../../test/convex/integrations"
import {
  slackDisplayTools,
  slackToolSnapshot,
} from "../../../../test/convex/tools"
import { summarizeRun } from "../summaries"

test("shows stored tools for event job runs", async () => {
  const run = testRun(eventRun(), { preparedTools: slackToolSnapshot() })
  const summary = await summarizeRun(
    fakeQueryCtx(
      {
        event: event(),
        integration: slackIntegration(),
        run,
      },
      { traces: preparedTraceRows(run) }
    ),
    run
  )

  expect(summary.details).toContainEqual(slackToolsDetail())
  expect(summary.details).toContainEqual(webSearchDetail("Allowed"))
})

test("shows stored blocked web search for event job runs", async () => {
  const run = testRun(eventRun(), { preparedTools: slackToolSnapshot(false) })
  const summary = await summarizeRun(
    fakeQueryCtx(
      {
        event: event(),
        integration: slackIntegration(),
        run,
      },
      { traces: preparedTraceRows(run) }
    ),
    run
  )

  expect(summary.details).toContainEqual(webSearchDetail("Blocked"))
})

test("shows stored tools for mention and reply runs", async () => {
  for (const kind of ["mention", "reply"] as const) {
    const run = testRun(messageRun(kind), {
      preparedTools: slackToolSnapshot(),
    })
    const summary = await summarizeRun(
      fakeQueryCtx(
        {
          integration: slackIntegration(),
          message: message(kind),
          run,
        },
        { traces: preparedTraceRows(run) }
      ),
      run
    )

    expect(summary.details).toContainEqual(slackToolsDetail())
    expect(summary.details).toContainEqual(webSearchDetail("Allowed"))
  }
})

test("marks approval-required access counts in mention and reply runs", async () => {
  for (const kind of ["mention", "reply"] as const) {
    const run = testRun(messageRun(kind), {
      preparedTools: slackToolSnapshot(true, "read"),
    })
    const summary = await summarizeRun(
      fakeQueryCtx(
        {
          integration: slackIntegration(),
          message: message(kind),
          run,
        },
        { traces: preparedTraceRows(run) }
      ),
      run
    )

    expect(summary.details).toContainEqual(slackToolsDetail("read"))
  }
})
function event() {
  return {
    _id: "event",
    _creationTime: 0,
    organizationId: "organization",
    integrationId: "integration",
    key: "slack:event",
    type: "message.created",
    data: { channel: { id: "C123", name: "social" } },
  }
}

function message(kind: "mention" | "reply") {
  return {
    _id: "message",
    _creationTime: 0,
    organizationId: "organization",
    integrationId: "integration",
    surface: "slack",
    type: "message.channels",
    externalId: `slack:${kind}`,
    mentioned: kind === "mention",
    text: "Please summarize this thread.",
    data: { channel: { id: "C123", name: "social" } },
    createdAt: 0,
  }
}

function eventRun() {
  return {
    job: { id: "missing-job" },
    cause: { type: "event", eventId: "event" },
    instructions: "Perform the deep analysis.",
    snapshot: {
      title: "Deep analysis",
      ...eventJobDisplay({
        context: [{ type: "channel", label: "C123" }],
        surface: "slack",
      }),
    },
  }
}

function messageRun(kind: "mention" | "reply") {
  return {
    cause: { type: "message", messageId: "message", kind },
    snapshot: {
      title: "Please summarize this thread.",
      ...messageDisplay({
        context: [{ type: "channel", label: "C123" }],
        kind,
      }),
    },
  }
}
function slackToolsDetail(approvalAccess?: "read" | "write") {
  return {
    type: "tools",
    label: `Slack · Read 1${approvalAccess === "read" ? "*" : ""} · Write 1${approvalAccess === "write" ? "*" : ""}`,
    groups: [
      {
        type: "slack",
        label: "Slack",
        tools: slackDisplayTools(approvalAccess),
      },
    ],
  }
}

function webSearchDetail(label: "Allowed" | "Blocked") {
  return {
    type: "web_search",
    label,
  }
}
