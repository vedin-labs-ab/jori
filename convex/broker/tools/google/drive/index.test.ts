import { afterEach, expect, test, vi } from "vitest"
import { type Doc } from "../../../../_generated/dataModel"
import { callGoogleTool } from ".."

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

test("searches Drive files with bounded list parameters", async () => {
  const calls = mockGoogleFetch({ files: [] })

  const result = await callGoogleTool(
    googleDriveIntegration(),
    "google_drive_search_files",
    {
      includeItemsFromAllDrives: true,
      pageSize: 5,
      q: "name contains 'Report'",
      supportsAllDrives: true,
    }
  )

  expect(result).toEqual({ files: [] })
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe("https://www.googleapis.com/drive/v3/files")
  expect(calls[0]?.method).toBe("GET")
  expect(calls[0]?.params).toMatchObject({
    includeItemsFromAllDrives: "true",
    pageSize: "5",
    q: "name contains 'Report' and trashed=false",
    spaces: "drive",
    supportsAllDrives: "true",
  })
  expect(calls[0]?.params.fields).toContain("nextPageToken")
  expect(calls[0]?.params.fields).toContain("files(id,name,mimeType")
})

test("creates Drive files with multipart metadata and content", async () => {
  const calls = mockGoogleFetch({ id: "file-id", name: "notes.txt" })

  const result = await callGoogleTool(
    googleDriveIntegration(),
    "google_drive_create_file",
    {
      content: "Meeting notes",
      name: "notes.txt",
      parents: ["folder-id"],
    }
  )

  expect(result).toEqual({ id: "file-id", name: "notes.txt" })
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe("https://www.googleapis.com/upload/drive/v3/files")
  expect(calls[0]?.method).toBe("POST")
  expect(calls[0]?.params).toMatchObject({
    uploadType: "multipart",
  })
  expect(calls[0]?.headers["content-type"]).toContain("multipart/related")
  expect(calls[0]?.rawBody).toContain(
    JSON.stringify({
      name: "notes.txt",
      mimeType: "text/plain",
      parents: ["folder-id"],
    })
  )
  expect(calls[0]?.rawBody).toContain("Meeting notes")
})

test("exports Google Workspace file content as bounded text", async () => {
  const calls = mockGoogleFetch((url: Parameters<typeof fetch>[0]) => {
    if (String(url).includes("/export")) {
      return new Response("abcdef")
    }

    return Response.json({
      id: "doc-id",
      name: "Doc",
      mimeType: "application/vnd.google-apps.document",
    })
  })

  const result = await callGoogleTool(
    googleDriveIntegration(),
    "google_drive_read_file",
    {
      fileId: "doc-id",
      maxCharacters: 3,
    }
  )

  expect(result).toMatchObject({
    content: "abc",
    mimeType: "text/plain",
    truncated: true,
  })
  expect(calls).toHaveLength(2)
  expect(calls[0]?.url).toBe("https://www.googleapis.com/drive/v3/files/doc-id")
  expect(calls[1]?.url).toBe(
    "https://www.googleapis.com/drive/v3/files/doc-id/export"
  )
  expect(calls[1]?.params).toMatchObject({ mimeType: "text/plain" })
})

type MockGoogleFetchResponder = (
  url: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1]
) => Response | Promise<Response>

function mockGoogleFetch(responseBody: unknown | MockGoogleFetchResponder) {
  const calls: Array<{
    body: unknown
    headers: Record<string, string>
    method: string
    params: Record<string, string>
    rawBody: string | undefined
    url: string
  }> = []

  globalThis.fetch = vi.fn(async (url, init) => {
    const parsedUrl = new URL(String(url))
    const rawBody = typeof init?.body === "string" ? init.body : undefined

    calls.push({
      body:
        rawBody !== undefined && isJsonBody(init?.headers)
          ? JSON.parse(rawBody)
          : init?.body,
      headers: (init?.headers ?? {}) as Record<string, string>,
      method: init?.method ?? "GET",
      params: Object.fromEntries(parsedUrl.searchParams.entries()),
      rawBody,
      url: `${parsedUrl.origin}${parsedUrl.pathname}`,
    })

    if (isMockGoogleFetchResponder(responseBody)) {
      return await responseBody(url, init)
    }

    return Response.json(responseBody)
  })

  return calls
}

function isMockGoogleFetchResponder(
  value: unknown | MockGoogleFetchResponder
): value is MockGoogleFetchResponder {
  return typeof value === "function"
}

function isJsonBody(headers: RequestInit["headers"]) {
  return (
    typeof headers === "object" &&
    headers !== null &&
    !Array.isArray(headers) &&
    "content-type" in headers &&
    headers["content-type" as keyof typeof headers] === "application/json"
  )
}

function googleDriveIntegration(): Doc<"integrations"> {
  return {
    _id: "google-drive-integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "googleDrive",
    scope: "tenant",
    externalId: "google-account",
    email: "user@example.com",
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
