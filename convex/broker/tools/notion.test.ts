import { afterEach, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { callNotionTool } from "./notion"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

test("creates Notion pages with icon and cover payloads", async () => {
  const calls = mockNotionFetch({ id: "page_1" })

  const result = await callNotionTool(
    notionIntegration(),
    "notion_create_page",
    {
      cover: {
        type: "external",
        external: { url: "https://example.com/cover.png" },
      },
      icon: { type: "emoji", emoji: "🪿" },
      parent: { page_id: "parent_1" },
      properties: { title: { title: [{ text: { content: "Draft" } }] } },
    }
  )

  expect(result).toEqual({ id: "page_1" })
  expect(calls[0]).toMatchObject({
    body: {
      cover: {
        type: "external",
        external: { url: "https://example.com/cover.png" },
      },
      icon: { type: "emoji", emoji: "🪿" },
    },
    method: "POST",
    url: "https://api.notion.com/v1/pages",
  })
})

test("uploads saved files to Notion file uploads", async () => {
  const calls = mockNotionFetch((url: Parameters<typeof fetch>[0]) => {
    const pathname = new URL(String(url)).pathname

    return Response.json({
      id: "upload_1",
      status: pathname.endsWith("/send") ? "uploaded" : "pending",
    })
  })

  const result = await callNotionTool(
    notionIntegration(),
    "notion_upload_file",
    { fileId: "file_1" },
    fileContext()
  )

  expect(result).toMatchObject({
    file: { type: "file_upload", file_upload: { id: "upload_1" } },
    fileUpload: { id: "upload_1", status: "uploaded" },
  })
  expect(calls[0]).toMatchObject({
    body: {
      content_type: "image/png",
      filename: "ÅÄÖ-🚀.png",
      mode: "single_part",
    },
    url: "https://api.notion.com/v1/file_uploads",
  })
  expect(calls[1]).toMatchObject({
    formFileName: "ÅÄÖ-🚀.png",
    method: "POST",
    url: "https://api.notion.com/v1/file_uploads/upload_1/send",
  })
})

type MockNotionFetchResponder = (
  url: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1]
) => Response | Promise<Response>

function mockNotionFetch(responseBody: unknown | MockNotionFetchResponder) {
  const calls: Array<{
    body: unknown
    formFileName?: string
    method: string
    url: string
  }> = []

  globalThis.fetch = vi.fn(async (url, init) => {
    const parsedUrl = new URL(String(url))

    calls.push({
      body: readBody(init?.body),
      formFileName: readFormFileName(init?.body),
      method: init?.method ?? "GET",
      url: `${parsedUrl.origin}${parsedUrl.pathname}`,
    })

    return isResponder(responseBody)
      ? await responseBody(url, init)
      : Response.json(responseBody)
  })

  return calls
}

function readBody(body: BodyInit | null | undefined) {
  return typeof body === "string" ? JSON.parse(body) : body
}

function readFormFileName(body: BodyInit | null | undefined) {
  if (!(body instanceof FormData)) {
    return undefined
  }

  const file = body.get("file")

  return typeof file === "object" && file !== null && "name" in file
    ? String(file.name)
    : undefined
}

function isResponder(
  value: unknown | MockNotionFetchResponder
): value is MockNotionFetchResponder {
  return typeof value === "function"
}

function fileContext() {
  return {
    ctx: {
      runQuery: vi.fn(async () => file()),
      storage: {
        get: vi.fn(async () => new Blob(["data"], { type: "image/png" })),
      },
    } as unknown as ActionCtx,
    run: {
      organizationId: "organization",
      principal: { kind: "organization" },
    } as Doc<"runs">,
  }
}

function file(): Doc<"files"> {
  return {
    _id: "file_1",
    _creationTime: 0,
    organizationId: "organization",
    scope: "organization",
    runId: "run_1",
    storageId: "storage_1",
    name: "ÅÄÖ-🚀.png",
    mimeType: "image/png",
    size: 4,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"files">
}

function notionIntegration(): Doc<"integrations"> {
  return {
    _id: "notion_integration",
    _creationTime: 0,
    organizationId: "organization",
    integration: "notion",
    scope: "organization",
    externalId: "workspace",
    credentials: { tokens: { access: "notion-token" } },
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
