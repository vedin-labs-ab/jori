import { Folder, type LucideIcon } from "lucide-react"
import { useRef } from "react"
import { useEditing } from "../../edit/state"
import {
  facetEntries,
  type ListConfig,
  type ListFacet,
  useListControls,
} from "../../list/controls"
import { useRowSelection } from "../../list/selection"
import { ownerFacet } from "../../materials/owners"
import {
  type DragPayload,
  type FolderDragItem,
  type ResourceDragItem,
} from "../drag/plan"
import {
  type FolderResource,
  type ListedFolder,
  resourcePresentation,
} from "../types"

/** Rows the folder listing sorts, filters, and selects: subfolders and
 *  filed resources both carry a name, a time, and a kind. */
export type FolderListEntry = ListedFolder | FolderResource

export function isFolderEntry(entry: FolderListEntry): entry is ListedFolder {
  return !("type" in entry)
}

/** One id space over both row groups, for the selection. */
export function entryId(entry: FolderListEntry) {
  return isFolderEntry(entry)
    ? `folder:${entry.folderId}`
    : `${entry.type}:${entry.id}`
}

/** A filed resource as a drag carries it; `folderId` is the folder being
 *  viewed, where it already sits. */
export function resourceDragItem(
  resource: FolderResource,
  folderId: string
): ResourceDragItem {
  return {
    type: resource.type,
    id: resource.id,
    name: resource.name,
    mimeType: resource.mimeType,
    folderId,
  }
}

/** A listed folder as a drag carries it. */
export function folderDragItem(folder: ListedFolder): FolderDragItem {
  return { folderId: folder.folderId, name: folder.name }
}

/** The selection as a drag started on one of its rows carries it;
 *  `folderId` is the folder being viewed, where the resources sit. */
export function selectionPayload(
  selected: readonly FolderListEntry[],
  folderId: string | undefined
): DragPayload {
  return {
    folders: selected.filter(isFolderEntry).map(folderDragItem),
    resources: selected.flatMap((entry) =>
      isFolderEntry(entry) || folderId === undefined
        ? []
        : [resourceDragItem(entry, folderId)]
    ),
  }
}

/** The shared folder table's page state: name and time sorts, a kind facet
 *  spanning Folder and whatever resource kinds are listed, an owner facet
 *  over both groups at once — one column filters subfolders and filed
 *  resources alike — and a selection over what the filters leave. The two
 *  row groups narrow separately so subfolders keep leading. */
export function useFolderListing(listed: {
  folders: readonly ListedFolder[]
  resources: readonly FolderResource[]
}) {
  const config: ListConfig<FolderListEntry> = {
    facets: {
      kind: kindFacet(listed.resources),
      owner: ownerFacet([...listed.folders, ...listed.resources]),
    },
    sorts: {
      name: (entry) => entry.name,
      // Resources all rank alike, so within their group an items sort
      // leaves the name order standing.
      items: (entry) =>
        "type" in entry ? -1 : entry.folderCount + entry.resourceCount,
      updated: (entry) => entry.updatedAt,
    },
  }
  const controls = useListControls(config)
  // apply only filters and reorders, so the rows keep their type.
  const folders = controls.apply(listed.folders) as ListedFolder[]
  const editing = useEditing()
  const editId =
    editing?.edit?.surface === "contents" && editing.edit.item.kind === "folder"
      ? editing.edit.item.id
      : undefined
  const pinned = useRef<{ id: string; index: number } | undefined>(undefined)
  const editingFolder = listed.folders.find(
    (folder) => folder.folderId === editId
  )
  if (editingFolder) {
    const index = folders.findIndex((folder) => folder.folderId === editId)
    if (pinned.current?.id !== editId) {
      pinned.current = {
        id: editingFolder.folderId,
        index: index < 0 ? 0 : index,
      }
    }
    if (index >= 0) {
      folders.splice(index, 1)
    }
    folders.splice(
      Math.min(pinned.current?.index ?? 0, folders.length),
      0,
      editingFolder
    )
  } else {
    pinned.current = undefined
  }
  const resources = controls.apply(listed.resources) as FolderResource[]
  const selection = useRowSelection<FolderListEntry>({
    identify: entryId,
    rows: [...folders, ...resources],
  })

  return {
    controls,
    folders,
    kinds: facetEntries(config, ["kind"]),
    owners: facetEntries(config, ["owner"]),
    resources,
    selection,
  }
}

function kindFacet(
  resources: readonly FolderResource[]
): ListFacet<FolderListEntry> {
  const kinds = new Map<string, LucideIcon>([["Folder", Folder]])

  for (const resource of resources) {
    const { icon, label } = resourcePresentation(resource)

    kinds.set(label, icon)
  }

  return {
    label: "Kind",
    options: [...kinds].map(([label, icon]) => ({
      icon,
      label,
      value: label,
    })),
    resolve: (entry) =>
      "type" in entry ? resourcePresentation(entry).label : "Folder",
  }
}
