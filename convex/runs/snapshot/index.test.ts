import { expect, test } from "vitest"
import { id } from "../../../test/convex/database"
import { type Id } from "../../_generated/dataModel"
import {
  createAutomationRunSnapshot,
  createInstructionRunSnapshot,
  createMessageRunSnapshot,
} from "./index"

test("stores automation display data directly", () => {
  expect(
    createAutomationRunSnapshot({
      automation: automation({
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
        type: "automation",
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

function automation(
  overrides: Pick<
    Parameters<typeof createAutomationRunSnapshot>[0]["automation"],
    "instructions" | "name" | "trigger" | "type"
  >
): Parameters<typeof createAutomationRunSnapshot>[0]["automation"] {
  return {
    _id: id<"automations">("automation"),
    _creationTime: 0,
    organizationId: "organization",
    access: { integrations: [], web: false },
    status: "active",
    principal: { kind: "person", personId: "person" as Id<"persons"> },
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
    scope: "personal",
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
    integration: "slack",
    type: "message.channels",
    externalId: "slack:message",
    mentioned: false,
    conversationId: "conversation",
    text,
    data,
    createdAt: 0,
  }
}
