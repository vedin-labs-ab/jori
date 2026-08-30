import { type FileKind, fileKind } from "@/shared/files/kind"
import { type ListConfig, type ListFacet } from "../shared/list/controls"
import { type FolderNames, folderFacet } from "../shared/materials/folders"
import { ownerFacet } from "../shared/materials/owners"
import { type FileRow } from "./types"

/** What the file list headers sort and filter: the kinds present in the
 *  data, the organization's folders, and the page's sortable columns. */
export function fileListConfig(
  files: readonly FileRow[],
  folders: FolderNames | undefined
): ListConfig<FileRow> {
  return {
    facets: {
      folder: folderFacet(folders),
      kind: kindFacet(files),
      owner: ownerFacet(files),
    },
    sorts: {
      created: (file) => file.createdAt,
      name: (file) => file.name,
      size: (file) => file.size,
      updated: (file) => file.updatedAt,
    },
  }
}

/** Type facet over the kind labels the registry reads from the listed
 *  files, so the menu only offers kinds that actually occur — each with
 *  the kind's own icon. */
function kindFacet(files: readonly FileRow[]): ListFacet<FileRow> {
  const kindsByLabel = new Map<string, FileKind>()

  for (const file of files) {
    const kind = fileKind(file.mimeType, file.name)

    kindsByLabel.set(kind.label, kind)
  }

  const labels = [...kindsByLabel.keys()].sort((left, right) =>
    left.localeCompare(right)
  )

  return {
    label: "Type",
    options: labels.map((label) => ({
      icon: kindsByLabel.get(label)?.icon,
      label,
      value: label,
    })),
    resolve: rowKindLabel,
  }
}

function rowKindLabel(file: FileRow) {
  return fileKind(file.mimeType, file.name).label
}
