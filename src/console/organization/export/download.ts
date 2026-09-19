import { urlEpoch } from "@contracts/files"
import { type ConvexReactClient } from "convex/react"
import { type GenericId as Id } from "convex/values"
import { api } from "../../../../convex/_generated/api"

const sections = [
  "folders",
  "collections",
  "conversations",
  "jobs",
  "files",
] as const
const maximumBytes = 50 * 1024 * 1024
const encoder = new TextEncoder()
type Row = { _id: string } & Record<string, unknown>
type Page = { page: Row[]; isDone: boolean; continueCursor: string }

export async function workspaceExport(
  client: ConvexReactClient,
  organizationId: string
) {
  const { parts, add, remaining } = exportBuffer()
  add({
    format: "jori-export-v1",
    organizationId,
    exportedAt: new Date().toISOString(),
    scope:
      "Content visible to the requesting owner. Files contain base64 data. Changes during export may not be included.",
  })
  for (const section of sections) {
    await pages(
      (cursor) =>
        client.query(api.export.console.resources, {
          organizationId,
          section,
          cursor,
        }),
      async (row) => {
        if (section === "files") {
          const file = await client.query(api.export.console.file, {
            organizationId,
            fileId: row._id as Id<"files">,
            epoch: urlEpoch(Date.now()),
          })
          if (Math.ceil((file.size * 4) / 3) > remaining()) {
            throw new Error(
              "This export exceeds 50 MB. Contact support@usejori.com for a complete export."
            )
          }
          add({
            section,
            ...row,
            base64: await fileBase64(file.url, remaining(), file.size),
          })
        } else {
          add({ section, ...row })
        }
        if (section === "collections" || section === "conversations") {
          const child = section === "collections" ? "documents" : "messages"
          await pages(
            (cursor) =>
              client.query(api.export.console.children, {
                organizationId,
                section: child,
                parentId: row._id as Id<"collections"> | Id<"conversations">,
                cursor,
              }),
            async (item) => {
              add({ section: child, ...item })
            }
          )
        }
      }
    )
  }
  return new Blob([parts.join("\n"), "\n"], { type: "application/x-ndjson" })
}

async function pages(
  read: (cursor: string | null) => Promise<Page>,
  consume: (row: Row) => Promise<void>
) {
  let cursor: string | null = null
  for (;;) {
    const result = await read(cursor)
    for (const row of result.page) {
      await consume(row)
    }
    if (result.isDone) {
      return
    }
    if (result.continueCursor === cursor) {
      throw new Error("Export did not advance. Please try again.")
    }
    cursor = result.continueCursor
  }
}

async function fileBase64(url: string, budget: number, expectedSize: number) {
  const response = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
  })
  if (!response.ok || !response.body) {
    throw new Error(
      "A file could not be downloaded. Please try the export again."
    )
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      length += value.byteLength
      if (Math.ceil((length * 4) / 3) > budget) {
        throw new Error(
          "This export exceeds 50 MB. Contact support@usejori.com for a complete export."
        )
      }
      chunks.push(value)
    }
  } finally {
    await reader.cancel()
  }
  if (length !== expectedSize) {
    throw new Error(
      "A downloaded file did not match its stored size. Contact support before deleting this workspace."
    )
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  let binary = ""
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

export function saveExport(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `jori-export-${new Date().toISOString().slice(0, 10)}.ndjson`
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportBuffer() {
  const parts: string[] = []
  let bytes = 0
  return {
    parts,
    remaining: () => maximumBytes - bytes,
    add(value: unknown) {
      const part = JSON.stringify(value)
      bytes += encoder.encode(part).byteLength + 1
      if (bytes > maximumBytes) {
        throw new Error(
          "This export exceeds 50 MB. Contact support@usejori.com for a complete export."
        )
      }
      parts.push(part)
    },
  }
}
