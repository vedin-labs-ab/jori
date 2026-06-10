import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { callSlackTool } from "./slack"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("Slack message tool", () => {
  test("forwards Block Kit blocks with the text fallback", async () => {
    const calls = mockSlackFetch({ ok: true, ts: "111.222" })
    const blocks = [
      { type: "header", text: { type: "plain_text", text: "Report" } },
    ]

    const result = await callSlackTool(
      slackIntegration(),
      "conversations_add_message",
      {
        channel: "C123",
        text: "Report summary",
        thread_ts: "123.456",
        blocks,
      }
    )

    expect(result).toEqual({ ok: true, ts: "111.222" })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("https://slack.com/api/chat.postMessage")
    expect(calls[0]?.body).toMatchObject({
      channel: "C123",
      text: "Report summary",
      thread_ts: "123.456",
      blocks,
    })
  })

  test("omits empty blocks", async () => {
    const calls = mockSlackFetch({ ok: true, ts: "111.222" })

    await callSlackTool(slackIntegration(), "conversations_add_message", {
      channel: "C123",
      text: "Hello",
      blocks: [],
    })

    expect(calls[0]?.body).not.toHaveProperty("blocks")
  })

  test("rejects malformed blocks", async () => {
    mockSlackFetch({ ok: true })

    await expect(
      callSlackTool(slackIntegration(), "conversations_add_message", {
        channel: "C123",
        text: "Hello",
        blocks: ["not-a-block"],
      })
    ).rejects.toThrow("blocks must be an array of Block Kit block objects")
  })
})

function mockSlackFetch(responseBody: unknown) {
  const calls: Array<{ body: unknown; url: string }> = []

  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      url: String(url),
    })

    return Response.json(responseBody)
  })

  return calls
}

function slackIntegration(): Doc<"integrations"> {
  return {
    _id: "slack-integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "slack",
    scope: "tenant",
    externalId: "slack-account",
    credentials: {
      bot: "bot-token",
      user: "user-token",
    },
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
