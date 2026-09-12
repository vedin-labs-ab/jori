import { type ConvexReactClient } from "convex/react"
import { getFunctionName } from "convex/server"
import { afterEach, expect, test, vi } from "vitest"
import { workspaceExport } from "./download"

afterEach(() => vi.unstubAllGlobals())

test("export includes downloaded file bytes and chat children without retaining download URLs", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("hello"))
  )
  const client = {
    query: vi.fn(async (ref, args) => {
      const name = getFunctionName(ref)
      if (name.endsWith(":file")) {
        return { url: "https://regional.example/secret-url", size: 5 }
      }
      if (name.endsWith(":children")) {
        return {
          page: [{ _id: "message-1", text: "Hello" }],
          isDone: true,
          continueCursor: "",
        }
      }
      const page =
        args.section === "files"
          ? [{ _id: "file-1", name: "hello.txt" }]
          : args.section === "conversations"
            ? [{ _id: "chat-1", title: "Chat" }]
            : []
      return { page, isDone: true, continueCursor: "" }
    }),
  } as unknown as ConvexReactClient
  const text = await (await workspaceExport(client, "org")).text()
  expect(text).toContain('"base64":"aGVsbG8="')
  expect(text).toContain('"section":"messages"')
  expect(text).not.toContain("secret-url")
})

test("a missing file fails the whole export rather than producing an incomplete download", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("missing", { status: 404 }))
  )
  const client = {
    query: vi.fn(async (ref, args) =>
      getFunctionName(ref).endsWith(":file")
        ? { url: "https://regional.example/file", size: 5 }
        : {
            page: args.section === "files" ? [{ _id: "file-1" }] : [],
            isDone: true,
            continueCursor: "",
          }
    ),
  } as unknown as ConvexReactClient
  await expect(workspaceExport(client, "org")).rejects.toThrow(
    "could not be downloaded"
  )
})

test("oversized exports stop before fetching a file that exceeds the browser budget", async () => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  const client = {
    query: vi.fn(async (ref, args) =>
      getFunctionName(ref).endsWith(":file")
        ? { url: "https://regional.example/file", size: 50 * 1024 * 1024 }
        : {
            page: args.section === "files" ? [{ _id: "file-1" }] : [],
            isDone: true,
            continueCursor: "",
          }
    ),
  } as unknown as ConvexReactClient
  await expect(workspaceExport(client, "org")).rejects.toThrow("exceeds 50 MB")
  expect(fetch).not.toHaveBeenCalled()
})
