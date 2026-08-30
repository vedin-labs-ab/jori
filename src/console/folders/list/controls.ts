import { Folder, type LucideIcon } from "lucide-react"
import {
  facetEntries,
  type ListConfig,
  type ListFacet,
  useListControls,
} from "../../shared/list/controls"
import {
  type FolderResource,
  type ListedFolder,
  resourcePresentation,
} from "../types"

/** Rows the folder listing sorts and filters: subfolders and filed
 *  resources both carry a name, a time, and a kind. */
type FolderListEntry = ListedFolder | FolderResource

/** Header controls for the shared folder table: name and time sorts plus a
 *  kind facet spanning Folder and whatever resource kinds are listed. The
 *  two row groups apply separately so subfolders keep leading. */
export function useFolderListControls(resources: readonly FolderResource[]) {
  const config: ListConfig<FolderListEntry> = {
    facets: { kind: kindFacet(resources) },
    sorts: {
      name: (entry) => entry.name,
      updated: (entry) => entry.updatedAt,
    },
  }
  const controls = useListControls(config)

  return {
    controls,
    kinds: facetEntries(config, ["kind"]),
    narrow<Row extends FolderListEntry>(rows: readonly Row[]): Row[] {
      // apply only filters and reorders, so the rows keep their type.
      return controls.apply(rows) as Row[]
    },
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
