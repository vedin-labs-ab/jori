import { type ChatConversation } from "@/shared/console/chat/types"
import { moveTarget, resourceSubject } from "@/shared/console/folders/types"
import { type ActivityItem } from "@/shared/console/runs/activity/types"
import {
  type ReferenceTarget,
  type ReferenceView,
} from "../../../shared/console/references"
import { type DemoConversation } from "../fixtures/chat"
import { log } from "../fixtures/runs/steps"
import { type DemoState } from "../state/types"
import { folderOf, folderTrail } from "./folders"

export function chatViews(state: DemoState): ChatConversation[] {
  return state.chat.conversations.map((chat) => ({
    id: chat.id,
    title: chat.title,
    folderId: chat.folderId,
    updatedAt: chat.updatedAt,
    visibility: chat.visibility,
    createdBy: chat.createdBy,
  }))
}

/** A reply's target as the workspace resolves it: the material, job,
 *  folder, run, or chat by that id, with where it is filed as the detail. */
export function resolveReference(
  state: DemoState,
  target: ReferenceTarget
): ReferenceView | undefined {
  const { id, kind } = target

  switch (kind) {
    case "chat": {
      const conversation = state.chat.conversations.find(
        (candidate) => candidate.id === id
      )

      return conversation === undefined
        ? undefined
        : {
            kind,
            id,
            name: conversation.title,
            detail: trail(state, conversation.folderId),
          }
    }
    case "folder": {
      const folder = folderOf(state, id)

      return folder === undefined
        ? undefined
        : { kind, id, name: folder.name, detail: trail(state, folder.parentId) }
    }
    case "job": {
      const job = state.jobs.find((candidate) => candidate.id === id)

      return job === undefined
        ? undefined
        : { kind, id, name: job.name, detail: trail(state, job.folderId) }
    }
    case "run": {
      const run = state.runs.find((candidate) => candidate.id === id)

      return run === undefined ? undefined : { kind, id, name: run.title }
    }
    default: {
      const material = state.materials.find(
        (candidate) => candidate.id === id && candidate.kind === kind
      )

      return material === undefined
        ? undefined
        : {
            kind,
            id,
            name: material.name,
            detail: trail(state, material.folderId),
          }
    }
  }
}

export function chatMoveSubject(conversation: DemoConversation) {
  return resourceSubject([
    moveTarget("chat", conversation.id, {
      name: conversation.title,
      folderId: conversation.folderId,
    }),
  ])
}

/** Where something is filed, as the folders from the root down. */
function trail(state: DemoState, folderId: string | undefined) {
  const folder = folderId === undefined ? undefined : folderOf(state, folderId)

  return folder === undefined
    ? undefined
    : folderTrail(state, folder)
        .map((segment) => segment.name)
        .join(" › ")
}

/** What the live run has done so far: it started, read the table, and is
 *  thinking about what it read. */
export function liveActivity(startedAt: number): ActivityItem[] {
  return log(startedAt, "chat", [
    { kind: "start" },
    {
      kind: "tool",
      tool: "list_table_rows",
      ms: 300,
      target: "Customer renewals",
      outcome: "4 rows",
    },
    { kind: "live" },
  ]).items
}
