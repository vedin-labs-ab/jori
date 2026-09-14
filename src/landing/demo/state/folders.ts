import { subtreeFolderIds } from "@/shared/console/folders/tree"
import { viewerId } from "../fixtures/people"
import { type DemoFolder, type FolderId } from "../fixtures/types"
import { type DemoAction, type DemoState } from "./types"

export function reduceFolders(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "createFolder":
      return {
        ...state,
        folders: [
          ...state.folders,
          {
            folderId: action.folderId,
            name: action.name,
            parentId: action.parentId,
            visibility: { mode: "organization" },
            createdBy: viewerId,
            createdAt: action.at,
            updatedAt: action.at,
          },
        ],
      }
    case "renameFolder":
      return patchFolder(state, action.folderId, {
        name: action.name,
        updatedAt: action.at,
      })
    case "moveFolder":
      return patchFolder(state, action.folderId, {
        parentId: action.parentId ?? undefined,
        updatedAt: action.at,
      })
    case "deleteFolder":
      return deleteFolder(state, action.folderId, action.deleteResources)
    case "fileResource":
      return fileResource(state, action)
    default:
      return state
  }
}

function patchFolder(
  state: DemoState,
  folderId: FolderId,
  patch: Partial<DemoFolder>
): DemoState {
  return {
    ...state,
    folders: state.folders.map((folder) =>
      folder.folderId === folderId ? { ...folder, ...patch } : folder
    ),
  }
}

/** Deleting takes the whole subtree; what was filed inside moves up to
 *  the parent unless the delete asked to take it too. */
function deleteFolder(
  state: DemoState,
  folderId: FolderId,
  deleteResources: boolean
): DemoState {
  const doomed = subtreeFolderIds(state.folders, folderId)
  const parentId = state.folders.find(
    (folder) => folder.folderId === folderId
  )?.parentId
  const survives = (item: { folderId?: FolderId }) =>
    item.folderId === undefined || !doomed.has(item.folderId)
  const refiled = <Item extends { folderId?: FolderId }>(item: Item): Item =>
    survives(item) ? item : { ...item, folderId: parentId }
  const chats = state.chat.conversations
  const movedChats = new Set<string>(
    chats.filter((chat) => !survives(chat)).map((chat) => chat.id)
  )
  const conversations = deleteResources
    ? chats.filter(survives)
    : chats.map(refiled)

  return {
    ...state,
    chat: {
      conversations,
      live:
        deleteResources && movedChats.has(state.chat.live?.conversationId ?? "")
          ? null
          : state.chat.live,
    },
    folders: state.folders.filter((folder) => !doomed.has(folder.folderId)),
    materials: deleteResources
      ? state.materials.filter(survives)
      : state.materials.map(refiled),
    jobs: deleteResources
      ? state.jobs.filter(survives)
      : state.jobs.map(refiled),
    usage: state.usage.map((row) =>
      row.folderId !== undefined && doomed.has(row.folderId)
        ? { ...row, folderId: parentId }
        : row
    ),
  }
}

function fileResource(
  state: DemoState,
  action: Extract<DemoAction, { type: "fileResource" }>
): DemoState {
  const folderId = action.folderId ?? undefined

  if (action.resourceType === "chat") {
    return {
      ...state,
      chat: {
        ...state.chat,
        conversations: state.chat.conversations.map((chat) =>
          chat.id === action.id ? { ...chat, folderId } : chat
        ),
      },
      usage: state.usage.map((row) =>
        row.conversationId === action.id ? { ...row, folderId } : row
      ),
    }
  }

  if (action.resourceType === "job") {
    return {
      ...state,
      jobs: state.jobs.map((job) =>
        job.id === action.id ? { ...job, folderId, updatedAt: action.at } : job
      ),
    }
  }

  return {
    ...state,
    materials: state.materials.map((material) =>
      material.id === action.id
        ? { ...material, folderId, updatedAt: action.at }
        : material
    ),
  }
}
