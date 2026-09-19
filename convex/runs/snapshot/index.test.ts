import { expect, test } from "vitest"
import { id } from "../../../test/convex/database"
import { integrationDoc } from "../../../test/convex/integrations"
import { type Id } from "../../_generated/dataModel"
import {
  createInstructionRunSnapshot,
  createJobRunSnapshot,
  createMessageRunSnapshot,
} from "./index"

test("stores job display data directly", () => {
  expect(
    createJobRunSnapshot({
      job: job({
        name: "Daily digest",
        instructions: "Summarize Slack and send the digest.",
        type: "once",
        trigger: { at: 1000 },
      }),
    })
  ).toEqual({
    access: { integrations: [], jori: [] },
    instructions: "Summarize Slack and send the digest.",
    snapshot: {
      title: "Daily digest",
      source: {
        type: "job",
        surface: "jori",
      },
      context: [],
    },
  })
})

test("snapshots message source details and source link", () => {
  expect(
    createMessageRunSnapshot({
      integration: integration(),
      kind: "mention",
      message: message("\nPlease summarize this thread.\n", {
        channel: { id: "C123", name: "product" },
        ts: "1700000000.000000",
      }),
    })
  ).toEqual({
    snapshot: {
      title: "Please summarize this thread.",
      source: {
        type: "message",
        surface: "slack",
        url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=team",
      },
      context: [
        {
          type: "channel",
          label: "#product",
          url: "https://slack.com/app_redirect?channel=C123&team=team",
        },
      ],
    },
  })
})

test.each([true, false])(
  "snapshots event jobs with event present: %s",
  (hasEvent) => {
    const sourceMessage = message("Summarize this thread.", {
      channel: { id: "C123", name: "product" },
      ts: "1700000000.000000",
    })
    const event = {
      ...sourceMessage,
      _id: id<"events">("event"),
      integrationId: id<"integrations">("integration"),
      key: "event",
    }
    const eventJob = job({
      name: "Digest",
      instructions: "Summarize.",
      type: "event",
      trigger: {
        integrationId: id<"integrations">("integration"),
        event: "message.created",
      },
    })
    const snapshot = createJobRunSnapshot({
      job: eventJob,
      event: hasEvent ? event : null,
      integration: integration(),
    }).snapshot
    const messageSnapshot = createMessageRunSnapshot({
      message: sourceMessage,
      integration: integration(),
      kind: "mention",
    }).snapshot

    expect(snapshot).toEqual({
      title: "Digest",
      source: hasEvent
        ? { ...messageSnapshot.source, type: "job" }
        : { type: "job", surface: "slack" },
      context: hasEvent ? messageSnapshot.context : [],
    })
    expect(
      createJobRunSnapshot({ job: eventJob, event: hasEvent ? event : null })
        .snapshot
    ).toEqual({
      title: "Digest",
      source: { type: "job" },
      context: [],
    })
  }
)

test("provider messages retain context without an integration record", () => {
  expect(
    createMessageRunSnapshot({
      integration: null,
      kind: "mention",
      message: message("Summarize.", {
        channel: { id: "C123", name: "product" },
      }),
    }).snapshot
  ).toEqual({
    title: "Summarize.",
    source: { type: "message", surface: "slack" },
    context: [{ type: "channel", label: "#product" }],
  })
})

test("console messages read as Jori's own surface, with what the chat was opened about", () => {
  const consoleMessage = {
    ...message("Plan the launch.\nThree milestones."),
    surface: "console" as const,
    integrationId: undefined,
    type: "console.message",
    data: { context: { kind: "folder", id: "folders:1" } },
  }

  expect(
    createMessageRunSnapshot({
      integration: null,
      kind: "mention",
      message: consoleMessage,
    })
  ).toEqual({
    snapshot: {
      title: "Plan the launch.",
      source: { type: "message", surface: "jori" },
      context: [],
    },
  })
  expect(
    createMessageRunSnapshot({
      context: { kind: "table", id: "collections:1", name: "Renewals" },
      integration: null,
      kind: "mention",
      message: consoleMessage,
    }).snapshot.context
  ).toEqual([{ type: "table", label: "Renewals" }])
  // A run is on the Activity page already; it gets no chip.
  expect(
    createMessageRunSnapshot({
      context: { kind: "run", id: "runs:1", name: "Chase the renewals" },
      integration: null,
      kind: "mention",
      message: consoleMessage,
    }).snapshot.context
  ).toEqual([])
})

test("instruction runs describe only themselves", () => {
  expect(
    createInstructionRunSnapshot({
      instructions: "Research the attendees.\nDraft the dossier.",
    })
  ).toEqual({
    instructions: "Research the attendees.\nDraft the dossier.",
    snapshot: {
      title: "Research the attendees.",
      source: { type: "manual" },
      context: [],
    },
  })
})

test("rejects empty run titles", () => {
  expect(() =>
    createMessageRunSnapshot({
      integration: integration(),
      kind: "reply",
      message: message("   "),
    })
  ).toThrow("Run title cannot be empty.")
})

function job(
  overrides: Pick<
    Parameters<typeof createJobRunSnapshot>[0]["job"],
    "instructions" | "name" | "trigger" | "type"
  >
): Parameters<typeof createJobRunSnapshot>[0]["job"] {
  return {
    _id: id<"jobs">("job"),
    _creationTime: 0,
    organizationId: "organization",
    access: { integrations: [], jori: [] },
    status: "active",
    principal: { kind: "person", personId: "person" as Id<"persons"> },
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
    visibility: { mode: "private" },
    ...overrides,
  }
}

function integration(): Parameters<
  typeof createMessageRunSnapshot
>[0]["integration"] {
  return integrationDoc({ integration: "slack", externalId: "team" })
}

function message(
  text: string,
  data?: unknown
): Parameters<typeof createMessageRunSnapshot>[0]["message"] {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    surface: "slack",
    type: "message.channels",
    externalId: "slack:message",
    mentioned: false,
    conversationId: "conversation",
    text,
    data,
    createdAt: 0,
  }
}
