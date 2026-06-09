import { describe, expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { assemblePrompt } from "./prompt"

describe("runtime prompts", () => {
  test.each([
    [
      "github",
      {
        repository: { fullName: "acme/app" },
        issueNumber: 12,
      },
      "GitHub",
      "acme/app#12",
    ],
    ["linear", { issueId: "ISSUE-1" }, "Linear", "ISSUE-1"],
    ["slack", { channelId: "C123" }, "Slack", "C123"],
  ] as const)("renders %s message trigger target context", (provider, data, providerLabel, targetId) => {
    const prompt = assemblePrompt(runtimeInput(provider, data), [])

    expect(prompt.rendered).toContain(`Provider: ${providerLabel}`)
    expect(prompt.rendered).toContain(`Target ID: ${targetId}`)
  })
})

function runtimeInput(provider: "github" | "linear" | "slack", data: unknown) {
  return {
    type: "message",
    provider,
    execution: {
      _id: "execution",
      _creationTime: 0,
      tenantId: "tenant",
      triggerId: "trigger",
      status: "pending",
      startedAt: 0,
      updatedAt: 0,
    },
    trigger: {
      _id: "trigger",
      _creationTime: 0,
      tenantId: "tenant",
      type: "message",
      provider,
      status: "active",
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

function integration(provider: string): Doc<"integrations"> {
  return {
    _id: `${provider}-integration`,
    _creationTime: 0,
    tenantId: "tenant",
    provider,
    scope: "tenant",
    accountId: `${provider}-account`,
    credentials: {},
    status: "active",
    createdAt: 0,
  } as Doc<"integrations">
}
