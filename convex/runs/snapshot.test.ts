import { expect, test } from "vitest"
import { type DataModel, type Id } from "../_generated/dataModel"
import {
  createAutomationRunSnapshot,
  createMessageRunSnapshot,
} from "./snapshot"

test("stores automation display data directly", () => {
  expect(
    createAutomationRunSnapshot({
      automation: automation({
        name: "Daily digest",
        instructions: "Summarize Slack and send the digest.",
        trigger: { type: "once", at: 1000 },
      }),
    })
  ).toEqual({
    title: "Daily digest",
    task: "Summarize Slack and send the digest.",
    display: {
      source: {
        type: "automation",
        provider: { type: "milo", label: "Milo" },
        kind: { type: "one-shot", label: "one-shot" },
        metadata: [],
      },
      trigger: "Time automation",
      details: [],
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
    title: "Please summarize this thread.",
    task: "Please summarize this thread.",
    display: {
      source: {
        type: "message",
        kind: { type: "mention", label: "mention" },
        provider: { type: "slack", label: "Slack" },
        metadata: [{ type: "channel", label: "#product" }],
      },
      trigger: "Slack message",
      details: [
        {
          type: "channel",
          label: "#product",
          url: "https://slack.com/app_redirect?channel=C123&team=team",
        },
      ],
      taskSource: {
        label: "Source",
        url: "https://slack.com/app_redirect?channel=C123&message_ts=1700000000.000000&team=team",
      },
    },
  })
})

test("rejects empty run tasks", () => {
  expect(() =>
    createMessageRunSnapshot({
      integration: integration(),
      kind: "reply",
      message: message("   "),
    })
  ).toThrow("Run task cannot be empty.")
})

function automation(
  overrides: Pick<
    Parameters<typeof createAutomationRunSnapshot>[0]["automation"],
    "instructions" | "name" | "trigger"
  >
): Parameters<typeof createAutomationRunSnapshot>[0]["automation"] {
  return {
    _id: id<"automations">("automation"),
    _creationTime: 0,
    tenantId: "tenant",
    access: { integrations: [], web: false },
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function integration(): Parameters<
  typeof createMessageRunSnapshot
>[0]["integration"] {
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    tenantId: "tenant",
    provider: "slack",
    scope: "tenant",
    externalId: "team",
    credentials: {},
    status: "active",
    createdBy: "user",
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
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    provider: "slack",
    type: "message.channels",
    externalId: "slack:message",
    text,
    data,
    metadata:
      data === undefined ? [] : [{ type: "channel", label: "#product" }],
    createdAt: 0,
  }
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}
