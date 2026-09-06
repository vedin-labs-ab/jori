import { expect, test } from "vitest"
import { id } from "../../../test/convex/database"
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
    access: { integrations: [], web: false },
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

test("console messages read as Jori's own surface with no context", () => {
  expect(
    createMessageRunSnapshot({
      integration: null,
      kind: "mention",
      message: {
        ...message("Plan the launch.\nThree milestones."),
        surface: "console",
        integrationId: undefined,
        type: "console.message",
        data: { context: { kind: "folder", id: "folders:1" } },
      },
    })
  ).toEqual({
    snapshot: {
      title: "Plan the launch.",
      source: { type: "message", surface: "jori" },
      context: [],
    },
  })
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
    access: { integrations: [], web: false },
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
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    organizationId: "organization",
    integration: "slack",
    scope: "organization",
    externalId: "team",
    credentials: {},
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  }
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
