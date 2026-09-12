import { expect, test } from "vitest"
import {
  eventJobDisplay,
  fakeQueryCtx,
  messageDisplay,
  preparedTraceRows,
  testRun,
} from "../../../../test/convex/console"
import {
  slackDisplayTools,
  slackToolSnapshot,
} from "../../../../test/convex/tools"
import { summarizeRun } from "../summaries"

test.each([true, false])(
  "shows stored event job tools with web search allowed: %s",
  async (webSearch) => {
    const run = testRun(eventRun(), {
      preparedTools: slackToolSnapshot(webSearch),
    })
    const summary = await summarizeRun(
      fakeQueryCtx({ run }, { traces: preparedTraceRows(run) }),
      run
    )

    expect(summary.details).toContainEqual(slackToolsDetail())
    expect(summary.details).toContainEqual(
      webSearchDetail(webSearch ? "Allowed" : "Blocked")
    )
  }
)

test("shows stored tools for mention and reply runs", async () => {
  for (const kind of ["mention", "reply"] as const) {
    const run = testRun(messageRun(kind), {
      preparedTools: slackToolSnapshot(),
    })
    const summary = await summarizeRun(
      fakeQueryCtx({ run }, { traces: preparedTraceRows(run) }),
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
      fakeQueryCtx({ run }, { traces: preparedTraceRows(run) }),
      run
    )

    expect(summary.details).toContainEqual(slackToolsDetail("read"))
  }
})
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
