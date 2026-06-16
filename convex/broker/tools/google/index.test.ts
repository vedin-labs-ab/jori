import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc } from "../../../_generated/dataModel"
import { fileContext } from "../fixtures/files"
import { callGoogleTool } from "."

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
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

    expect(result).toEqual({ id: "sent-message" })
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

    expect(result).toEqual({ id: "draft" })
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

describe("Gmail file attachments", () => {
  test("sends attachments from files", async () => {
    const calls = mockGoogleFetch({ id: "sent-message" })

    await callGoogleTool(
      gmailIntegration(),
      "google_gmail_send_message",
      {
        attachments: [{ fileId: "file-id" }],
        body: "See attached.",
        subject: "File",
        to: ["recipient@example.com"],
      },
      fileContext()
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

function readRawMessage(body: unknown, path: string[] = ["raw"]) {
  const raw = path.reduce<unknown>((value, key) => {
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)[key]
      : undefined
  }, body)

  expect(raw).toEqual(expect.any(String))

  return decodeBase64Url(String(raw))
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
    tenantId: "tenant",
    integration: "gmail",
    scope: "user",
    ownerId: "user",
    externalId: "google-account",
    email: "sender@example.com",
    credentials: {
      tokens: { access: "access-token", refresh: "refresh-token" },
      expiresAt: Date.now() + 60_000,
    },
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
