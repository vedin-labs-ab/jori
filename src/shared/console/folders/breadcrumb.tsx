import { type ReactNode } from "react"
import {
  type MaterialBreadcrumb,
  type MaterialBreadcrumbSegment,
  renamedInTitle,
} from "../materials/breadcrumb"
import { FolderTitleMenu } from "./menu"
import { type FolderDetail, type FolderDialogRequest } from "./types"

export function folderBreadcrumb({
  folder,
  onDialog,
  aside,
  suffix,
  view = "contents",
}: {
  folder: FolderDetail
  onDialog: (request: FolderDialogRequest) => void
  aside?: ReactNode
  suffix?: ReactNode
  view?: "contents" | "usage"
}): MaterialBreadcrumb {
  const ancestors: MaterialBreadcrumbSegment[] = [
    { name: "Folders", to: "/folders" },
    ...folder.path.slice(0, -1).map((segment) => ({
      name: segment.name,
      params: { folderId: segment.folderId },
      to: "/folders/$folderId",
    })),
  ]

  if (view === "usage") {
    return {
      name: "Usage",
      suffix,
      trail: [
        ...ancestors,
        {
          name: folder.name,
          params: { folderId: folder.folderId },
          to: "/folders/$folderId",
        },
      ],
    }
  }

  return {
    aside,
    renderName: renamedInTitle({
      id: folder.folderId,
      kind: "folder",
      name: folder.name,
      parentId: folder.parentId,
    }),
    menu: <FolderTitleMenu folder={folder} onDialog={onDialog} />,
    name: folder.name,
    trail: ancestors,
  }
}
