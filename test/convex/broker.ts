import { vi } from "vitest"

export function mockJsonFetch(responseBody: (url: URL) => unknown) {
  const calls: Array<{ body: unknown; url: string }> = []

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = new URL(String(url))
      calls.push({
        body:
          typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
        url: String(url),
      })
      return Response.json(responseBody(requestUrl))
    })
  )

  return calls
}

/** The bytes behind the file context's one file. Tests that attach it mock
 *  convex/files/blobs so `readBlob` returns this. */
export function fileBlob() {
  return new Blob([new Uint8Array([104, 101, 108, 108, 111])])
}

export function createFileContext() {
  return {
    run: {
      _id: "run-id",
      _creationTime: 0,
      organizationId: "organization",
      principal: { kind: "organization" },
      promptId: "prompt-id",
      status: "running",
      createdAt: 0,
    },
    ctx: {
      runMutation: vi.fn(async () => ({
        channelId: "C123",
        recordFinal: false,
        source: false,
        threadTs: "123.456",
      })),
      runQuery: vi.fn(async () => ({
        _id: "file-id",
        _creationTime: 0,
        organizationId: "organization",
        scope: "organization",
        runId: "run-id",
        blobKey: "organization/blob-id",
        name: "kitten.png",
        mimeType: "image/png",
        size: 5,
        createdAt: 0,
        updatedAt: 0,
      })),
    },
  } as never
}
