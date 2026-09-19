import { afterEach, expect, test, vi } from "vitest"
import { integration } from "../../../test/convex/tools"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { callNotionTool } from "./notion"

vi.mock("../../files/blobs", () => ({
  readBlob: async () => new Blob(["data"], { type: "image/png" }),
}))

afterEach(() => vi.unstubAllGlobals())

test("creates Notion pages with icon and cover payloads", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({ id: "page_1" })
  )
  vi.stubGlobal("fetch", fetch)

  const result = await callNotionTool(
    integration("notion"),
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
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    "https://api.notion.com/v1/pages",
    expect.objectContaining({ method: "POST" })
  )
  expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({
    cover: {
      type: "external",
      external: { url: "https://example.com/cover.png" },
    },
    icon: { type: "emoji", emoji: "🪿" },
  })
})

test.each(["standard", "Convex"])(
  "uploads saved files with their MIME type using %s FormData",
  async (runtime) => {
    if (runtime === "Convex") {
      // Convex's FormData.set recreates File without preserving its MIME type.
      // append preserves it. Model that runtime behavior at the upload boundary.
      vi.stubGlobal(
        "FormData",
        class extends FormData {
          override set(name: string, value: string | Blob, filename?: string) {
            if (value instanceof Blob) {
              super.set(name, new Blob([value]), filename)
            } else {
              super.set(name, value)
            }
          }
        }
      )
    }
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
      const pathname = new URL(String(url)).pathname

      return Response.json({
        id: "upload_1",
        status: pathname.endsWith("/send") ? "uploaded" : "pending",
      })
    })

    vi.stubGlobal("fetch", fetch)
    const result = await callNotionTool(
      integration("notion"),
      "notion_upload_file",
      { fileId: "file_1" },
      fileContext()
    )

    expect(result).toMatchObject({
      file: { type: "file_upload", file_upload: { id: "upload_1" } },
      fileUpload: { id: "upload_1", status: "uploaded" },
    })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://api.notion.com/v1/file_uploads"
    )
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      content_type: "image/png",
      filename: "ÅÄÖ-🚀.png",
      mode: "single_part",
    })
    expect(fetch.mock.calls[1]).toEqual([
      "https://api.notion.com/v1/file_uploads/upload_1/send",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    ])
    const body = fetch.mock.calls[1]?.[1]?.body as FormData
    expect(body.get("file")).toMatchObject({
      name: "ÅÄÖ-🚀.png",
      type: "image/png",
    })
  }
)

function fileContext() {
  return {
    ctx: {
      runQuery: vi.fn(async () => file()),
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
    visibility: { mode: "organization" },
    runId: "run_1",
    blobKey: "organization/blob_1",
    name: "ÅÄÖ-🚀.png",
    mimeType: "image/png",
    size: 4,
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"files">
}

test("expires a rejected Notion grant during a tool call without exposing provider response content", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("private provider body", { status: 401 }))
  )
  const runMutation = vi.fn(async () => true)
  const { callProviderTool } = await import("./index")
  await expect(
    callProviderTool({
      ctx: { runMutation } as unknown as ActionCtx,
      integration: integration("notion"),
      tool: "notion_get_page",
      toolArgs: { pageId: "page" },
    })
  ).rejects.toThrow("Notion access has expired and needs to be reconnected.")
  expect(runMutation).toHaveBeenCalledOnce()
  expect(runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      integrationId: integration("notion")._id,
    })
  )
})
