import { afterEach, expect, test, vi } from "vitest"
import { type Id } from "../../../_generated/dataModel"
import { postSlackFiles } from "./upload"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

test("shares uploaded files to a DM selected by user ID", async () => {
  const bodies: unknown[] = []
  let call = 0

  globalThis.fetch = vi.fn(async (_input, init) => {
    bodies.push(parseBody(init?.body))
    call += 1

    if (call === 1) {
      return Response.json({
        ok: true,
        upload_url: "https://files.slack.com/upload/TICKET",
        file_id: "F1",
      })
    }

    return call === 2 ? new Response("") : Response.json({ ok: true })
  })

  await postSlackFiles("bot-token", {
    files: [
      {
        fileId: "file" as Id<"files">,
        bytes: new Uint8Array([1]),
        mimeType: "text/plain",
        name: "note.txt",
        size: 1,
      },
    ],
    channel: "U123",
    text: "Prep note",
  })

  expect(bodies[2]).toMatchObject({
    channels: "U123",
    initial_comment: "Prep note",
  })
  expect(bodies[2]).not.toHaveProperty("channel_id")
})

function parseBody(body: BodyInit | null | undefined) {
  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries())
  }

  return typeof body === "string" ? JSON.parse(body) : body
}
