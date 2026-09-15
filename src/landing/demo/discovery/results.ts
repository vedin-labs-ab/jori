import { type Hit } from "@contracts/discovery"
import { collapseWhitespace } from "@contracts/text"
import { type DemoState } from "../state/types"

/** A small, local preview over the demo's existing records. No indexing,
 * extraction, or remote search: only the text already on this page. */
export function demoResults(state: DemoState, query: string): Hit[] {
  const text = query.trim().toLowerCase()
  if (!text) {
    return []
  }
  const records = [
    ...state.folders.map((folder) =>
      result("folder", folder.folderId, folder.name)
    ),
    ...state.jobs.map((job) =>
      result("job", job.id, job.name, job.instructions)
    ),
    ...state.materials.map((material) =>
      result(
        material.kind,
        material.id,
        material.name,
        material.kind === "file" ? material.text : undefined
      )
    ),
    ...state.chat.conversations.map((chat) =>
      result("chat", chat.id, chat.title)
    ),
  ]
  return records
    .filter((hit) => `${hit.title} ${hit.snippet}`.toLowerCase().includes(text))
    .slice(0, 8)
    .map((hit) => ({
      ...hit,
      snippet: excerpt(hit.snippet, text),
    }))
}

function result(kind: Hit["kind"], id: string, title: string, text = ""): Hit {
  return {
    candidate: { key: `${kind}:${id}`, revision: "demo", part: 0, score: 1 },
    kind,
    resourceId: id,
    resourceName: title,
    title,
    snippet: text,
    location: { kind: "resource", id, field: text ? "content" : "name" },
  }
}

function excerpt(text: string, query: string) {
  const sentence = text
    .split(/\n+|(?<=[.!?])\s+/)
    .find((part) => part.toLowerCase().includes(query))
  return sentence ? collapseWhitespace(sentence) : ""
}
