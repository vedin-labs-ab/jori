import { type FolderImpact } from "@/shared/console/folders/dialogs/delete"
import {
  ancestorFolderIds,
  subtreeFolderIds,
} from "@/shared/console/folders/tree"
import {
  type FolderContentsResult,
  type FolderDetail,
  type FolderResource,
  type FolderRootsResult,
  type FolderRow,
} from "@/shared/console/folders/types"
import { type FolderNames } from "@/shared/console/materials/folders"
import { personName } from "../fixtures/people"
import { type DemoFolder, type FolderId } from "../fixtures/types"
import { type DemoState } from "../state/types"

// The folder views' inputs, read off the workspace the way the backend
// reads them off its tables: the tree, a folder's listing with its
// per-row counts, the crumb's trail, and what a delete would take.

export function folderOf(state: DemoState, folderId: string) {
  return state.folders.find((folder) => folder.folderId === folderId)
}

/** The sidebar's rows: every folder, marked when anything sits inside. */
export function folderRows(state: DemoState): FolderRow[] {
  return state.folders.map((folder) => ({
    ...folder,
    hasContents: hasContents(state, folder.folderId),
  }))
}

export function rootFolders(state: DemoState): FolderRootsResult {
  return { status: "ready", folders: listedFolders(state, undefined) }
}

export function folderContents(
  state: DemoState,
  folderId: FolderId
): FolderContentsResult {
  return {
    status: "ready",
    folders: listedFolders(state, folderId),
    resources: folderResources(state, folderId),
  }
}

export function folderDetail(
  state: DemoState,
  folderId: string
): FolderDetail | undefined {
  const folder = folderOf(state, folderId)

  return folder === undefined
    ? undefined
    : { ...folder, path: folderTrail(state, folder) }
}

/** Root first, the folder itself last. */
export function folderTrail(state: DemoState, folder: DemoFolder) {
  return [...ancestorFolderIds(state.folders, folder.folderId)]
    .reverse()
    .flatMap((ancestorId) => {
      const ancestor = folderOf(state, ancestorId)

      return ancestor === undefined ? [] : [ancestor]
    })
    .concat(folder)
    .map(({ folderId, name }) => ({ folderId, name }))
}

/** Folder names by id, for the lists' Folder column and facet. */
export function folderNames(state: DemoState): FolderNames {
  return new Map(
    state.folders.map((folder) => [
      folder.folderId as string,
      {
        hasContents: hasContents(state, folder.folderId),
        name: folder.name,
        parentId: folder.parentId as string | undefined,
      },
    ])
  )
}

export function subtreeIds(state: DemoState, folderId: string) {
  return subtreeFolderIds(state.folders, folderId)
}

/** What deleting the folder would take, and where the rest would land. */
export function folderImpact(state: DemoState, folderId: string): FolderImpact {
  const subtree = subtreeIds(state, folderId)
  const parentId = folderOf(state, folderId)?.parentId
  const filed = (item: { folderId?: FolderId }) =>
    item.folderId !== undefined && subtree.has(item.folderId)

  return {
    folderCount: subtree.size - 1,
    parentName:
      parentId === undefined ? null : (folderOf(state, parentId)?.name ?? null),
    resourceCount:
      state.materials.filter(filed).length +
      state.jobs.filter(filed).length +
      state.chat.conversations.filter(filed).length,
  }
}

/** The folders one level below a parent, name-sorted, each carrying the
 *  direct counts its listing row shows. */
function listedFolders(state: DemoState, parentId: FolderId | undefined) {
  return state.folders
    .filter((folder) => folder.parentId === parentId)
    .sort(byName)
    .map((folder) => {
      const folderCount = state.folders.filter(
        (child) => child.parentId === folder.folderId
      ).length
      const resourceCount = folderResources(state, folder.folderId).length

      return {
        ...folder,
        ownerId: folder.createdBy,
        ownerName: personName(folder.createdBy),
        ownerImage: undefined,
        folderCount,
        resourceCount,
        hasContents: folderCount + resourceCount > 0,
      }
    })
}

function folderResources(state: DemoState, folderId: FolderId) {
  const materials = state.materials
    .filter((material) => material.folderId === folderId)
    .map(
      (material): FolderResource => ({
        type: material.kind,
        id: material.id,
        name: material.name,
        visibility: material.visibility,
        updatedAt: material.updatedAt,
        ownerId: material.ownerId,
        ownerName: personName(material.ownerId),
        ownerImage: undefined,
        ...(material.kind === "file"
          ? { mimeType: material.mimeType, size: material.size }
          : {}),
      })
    )
  const jobs = state.jobs
    .filter((job) => job.folderId === folderId)
    .map(
      (job): FolderResource => ({
        type: "job",
        id: job.id,
        name: job.name,
        visibility: job.visibility,
        updatedAt: job.updatedAt,
        status: job.status,
      })
    )

  const chats = state.chat.conversations
    .filter((chat) => chat.folderId === folderId)
    .map(
      (chat): FolderResource => ({
        type: "chat",
        id: chat.id,
        name: chat.title,
        visibility: chat.visibility,
        updatedAt: chat.updatedAt,
        ownerId: chat.createdBy,
        ownerName: personName(chat.createdBy),
        ownerImage: undefined,
      })
    )

  return [...materials, ...jobs, ...chats].sort(byName)
}

function hasContents(state: DemoState, folderId: FolderId) {
  return (
    state.folders.some((folder) => folder.parentId === folderId) ||
    state.materials.some((material) => material.folderId === folderId) ||
    state.jobs.some((job) => job.folderId === folderId) ||
    state.chat.conversations.some((chat) => chat.folderId === folderId)
  )
}

function byName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name)
}
