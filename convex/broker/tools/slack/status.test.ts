import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc } from "../../../_generated/dataModel"
import { callSlackTool, setSlackThreadStatus } from "."

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("Slack assistant thread status", () => {
  test("sets the assistant thread status with the bot token", async () => {
    const calls = mockSlackFetch({ ok: true })

    const result = await setSlackThreadStatus(slackIntegration(), {
      channelId: "C123",
      status: "is working...",
      threadTs: "123.456",
    })

    expect(result).toEqual({ ok: true })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(
      "https://slack.com/api/assistant.threads.setStatus"
    )
    expect(calls[0]?.method).toBe("POST")
    expect(calls[0]?.headers).toMatchObject({
      authorization: "Bearer bot-token",
      "content-type": "application/json; charset=utf-8",
    })
    expect(calls[0]?.body).toMatchObject({
      channel_id: "C123",
      status: "is working...",
      thread_ts: "123.456",
    })
  })

  test("clears the assistant thread status with an empty status", async () => {
    const calls = mockSlackFetch({ ok: true })

    await setSlackThreadStatus(slackIntegration(), {
      channelId: "C123",
      status: "",
      threadTs: "123.456",
    })

    expect(calls[0]?.body).toMatchObject({
      channel_id: "C123",
      status: "",
      thread_ts: "123.456",
    })
  })
})

describe("Slack final replies", () => {
  test("clears assistant status before posting a threaded reply", async () => {
    const calls = mockSlackFetch({ ok: true, ts: "111.222" })
    const runAction = vi.fn(async () => {
      expect(calls).toHaveLength(0)
      return null
    })

    await callSlackTool(
      slackIntegration(),
      "conversations_add_message",
      {
        channel: "C123",
        text: "Hello",
        thread_ts: "123.456",
      },
      {
        ctx: { runAction },
        execution: { runId: "run-id" },
      } as never
    )

    expect(runAction).toHaveBeenCalledWith(expect.anything(), {
      channelId: "C123",
      runId: "run-id",
      threadTs: "123.456",
    })
    expect(calls[0]?.url).toBe("https://slack.com/api/chat.postMessage")
  })

  test("posts the reply when status clearing fails", async () => {
    const calls = mockSlackFetch({ ok: true, ts: "111.222" })
    const runAction = vi.fn(async () => {
      throw new Error("status clear failed")
    })

    await callSlackTool(
      slackIntegration(),
      "conversations_add_message",
      {
        channel: "C123",
        text: "Hello",
        thread_ts: "123.456",
      },
      {
        ctx: { runAction },
        execution: { runId: "run-id" },
      } as never
    )

    expect(calls[0]?.url).toBe("https://slack.com/api/chat.postMessage")
  })
})

function mockSlackFetch(
  responseBody: unknown | Response | Array<unknown | Response>
) {
  const calls: Array<{
    body: unknown
    headers: Record<string, string>
    method: string | undefined
    params: Record<string, string>
    url: string
  }> = []
  const responses = Array.isArray(responseBody) ? [...responseBody] : undefined

  globalThis.fetch = vi.fn(async (url, init) => {
    const parsedUrl = new URL(String(url))

    calls.push({
      body: parseSlackRequestBody(init?.body),
      headers: (init?.headers ?? {}) as Record<string, string>,
      method: init?.method,
      params: Object.fromEntries(parsedUrl.searchParams.entries()),
      url: `${parsedUrl.origin}${parsedUrl.pathname}`,
    })

    const response = responses?.shift() ?? responseBody

    return response instanceof Response ? response : Response.json(response)
  })

  return calls
}

function parseSlackRequestBody(body: BodyInit | null | undefined) {
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries())
  }

  return typeof body === "string" ? JSON.parse(body) : body
}

function slackIntegration(): Doc<"integrations"> {
  return {
    _id: "slack-integration",
    _creationTime: 0,
    tenantId: "tenant",
    integration: "slack",
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
