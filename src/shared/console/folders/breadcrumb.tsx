import { type ReactNode } from "react"
import {
  type MaterialBreadcrumb,
  type MaterialBreadcrumbSegment,
} from "../materials/breadcrumb"
import { VisibilityButton } from "../visibility/badge"
import { FolderName } from "./edit/name"
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
    audience: (
      <VisibilityButton
        visibility={folder.visibility}
        folderId={folder.parentId}
        ownerId={folder.createdBy}
        onClick={() => onDialog({ type: "access", folder })}
      />
    ),
    renderName: (name) => (
      <FolderName folder={folder} surface="title">
        {name}
      </FolderName>
    ),
    menu: <FolderTitleMenu folder={folder} onDialog={onDialog} />,
    name: folder.name,
    trail: ancestors,
  }
}
