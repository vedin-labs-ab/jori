import { afterEach, describe, expect, test, vi } from "vitest"
import { createAssetContext } from "../../../../test/convex/broker"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { callGoogleTool } from "."

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe("Gmail batch read tools", () => {
  test("reads multiple Gmail threads with one broker tool call", async () => {
    const calls = mockGoogleFetchByUrl((url) => ({
      id: url.pathname.split("/").at(-1),
    }))

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_get_threads",
      {
        threadIds: ["thread-a", "thread-b"],
      }
    )

    expect(result).toEqual([
      { threadId: "thread-a", messages: [] },
      { threadId: "thread-b", messages: [] },
    ])
    expect(calls.map((call) => call.url)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/threads/thread-a?format=full",
      "https://gmail.googleapis.com/gmail/v1/users/me/threads/thread-b?format=full",
    ])
  })

  test("reads multiple Gmail messages with one broker tool call", async () => {
    const calls = mockGoogleFetchByUrl((url) => ({
      id: url.pathname.split("/").at(-1),
    }))

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_get_messages",
      {
        messageIds: ["message-a", "message-b"],
      }
    )

    expect(result).toMatchObject([
      { provider: "gmail", messageId: "message-a" },
      { provider: "gmail", messageId: "message-b" },
    ])
    expect(calls.map((call) => call.url)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/message-a?format=full",
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/message-b?format=full",
    ])
  })
})

describe("Gmail write tools", () => {
  test("sends a new Gmail message", async () => {
    const calls = mockGoogleFetch({ id: "sent-message" })

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_send_message",
      {
        bcc: ["audit@example.com"],
        body: "Hello from Milo",
        cc: ["team@example.com"],
        subject: "Hello",
        to: ["recipient@example.com"],
      }
    )

    expect(result).toEqual({ status: "sent", messageId: "sent-message" })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    )

    const raw = readRawMessage(calls[0]?.body)
    expect(raw).toContain("To: recipient@example.com")
    expect(raw).toContain("Cc: team@example.com")
    expect(raw).toContain("Bcc: audit@example.com")
    expect(raw).toContain("Subject: Hello")
    expect(raw).toContain("Content-Type: text/plain; charset=UTF-8")
    expect(raw).toContain("\r\n\r\nHello from Milo")
  })

  test("creates a Gmail draft", async () => {
    const calls = mockGoogleFetch({ id: "draft" })

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_create_draft",
      {
        body: "<p>Hello from Milo</p>",
        bodyType: "HTML",
        subject: "Draft",
        to: ["recipient@example.com"],
      }
    )

    expect(result).toEqual({ status: "drafted", draftId: "draft" })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts"
    )

    const raw = readRawMessage(calls[0]?.body, ["message", "raw"])
    expect(raw).toContain("To: recipient@example.com")
    expect(raw).toContain("Subject: Draft")
    expect(raw).toContain("Content-Type: text/html; charset=UTF-8")
    expect(raw).toContain("\r\n\r\n<p>Hello from Milo</p>")
  })
})

describe("Gmail thread draft tools", () => {
  test("creates a Gmail reply draft for a thread", async () => {
    const calls = mockGoogleFetchByUrl((url) =>
      url.pathname.endsWith("/drafts")
        ? { id: "draft" }
        : {
            messages: [
              {
                internalDate: "1",
                payload: {
                  headers: [
                    { name: "From", value: "Client <client@example.com>" },
                    { name: "To", value: "sender@example.com" },
                    { name: "Subject", value: "Question" },
                    { name: "Message-Id", value: "<message-1>" },
                    { name: "References", value: "<root>" },
                  ],
                },
              },
            ],
          }
    )

    const result = await callGoogleTool(
      gmailIntegration(),
      "google_gmail_create_draft",
      {
        body: "I will look into this.",
        threadId: "thread-1",
      }
    )

    expect(result).toEqual({ status: "drafted", draftId: "draft" })
    expect(calls.map((call) => call.url)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/threads/thread-1?format=metadata",
      "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    ])
    expect(readThreadId(calls[1]?.body)).toBe("thread-1")

    const raw = readRawMessage(calls[1]?.body, ["message", "raw"])
    expect(raw).toContain("To: client@example.com")
    expect(raw).toContain("Subject: Re: Question")
    expect(raw).toContain("In-Reply-To: <message-1>")
    expect(raw).toContain("References: <root> <message-1>")
    expect(raw).toContain("\r\n\r\nI will look into this.")
  })
})

describe("Gmail assets", () => {
  test("sends run assets", async () => {
    const calls = mockGoogleFetch({ id: "sent-message" })

    await callGoogleTool(
      gmailIntegration(),
      "google_gmail_send_message",
      {
        assets: [{ assetId: "asset-id" }],
        body: "See attached.",
        subject: "File",
        to: ["recipient@example.com"],
      },
      createAssetContext()
    )

    const raw = readRawMessage(calls[0]?.body)

    expect(raw).toContain("Content-Type: multipart/mixed; boundary=")
    expect(raw).toContain("Content-Type: text/plain; charset=UTF-8")
    expect(raw).toContain("See attached.")
    expect(raw).toContain('Content-Type: image/png; name="kitten.png"')
    expect(raw).toContain(
      'Content-Disposition: attachment; filename="kitten.png"'
    )
    expect(raw).toContain("aGVsbG8=")
  })
})

function mockGoogleFetch(responseBody: unknown) {
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

function mockGoogleFetchByUrl(responseBody: (url: URL) => unknown) {
  const calls: Array<{ body: unknown; url: string }> = []

  globalThis.fetch = vi.fn(async (url, init) => {
    const requestUrl = new URL(String(url))

    calls.push({
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      url: requestUrl.toString(),
    })

    return Response.json(responseBody(requestUrl))
  })

  return calls
}

function readRawMessage(body: unknown, path: string[] = ["raw"]) {
  const raw = path.reduce<unknown>((value, key) => {
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)[key]
      : undefined
  }, body)

  expect(raw).toEqual(expect.any(String))

  return decodeBase64Url(String(raw))
}

function readThreadId(body: unknown) {
  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof body.message !== "object" ||
    body.message === null ||
    !("threadId" in body.message)
  ) {
    return undefined
  }

  return body.message.threadId
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  )

  return Buffer.from(padded, "base64").toString("utf8")
}

function gmailIntegration(): Doc<"integrations"> {
  return {
    _id: "gmail-integration",
    _creationTime: 0,
    organizationId: "organization",
    integration: "gmail",
    scope: "user",
    ownerId: "person" as Id<"persons">,
    externalId: "google-account",
    email: "sender@example.com",
    credentials: {
      tokens: { access: "access-token", refresh: "refresh-token" },
      expiresAt: Date.now() + 60_000,
    },
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
