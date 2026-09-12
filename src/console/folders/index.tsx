import { AskJoriAction } from "@/shared/console/chat/pane/ask"
import { FolderHeaderActions } from "@/shared/console/folders/header"
import { FolderContents } from "@/shared/console/folders/list/contents"
import { FolderFrame, type FramedFolder } from "./frame"
import { useFolderContents } from "./list/contents"

export function FolderPage({ folderId }: { folderId: string }) {
  return (
    <FolderFrame folderId={folderId} view="contents">
      {(framed) => <FolderContentsView framed={framed} />}
    </FolderFrame>
  )
}

function FolderContentsView({ framed }: { framed: FramedFolder }) {
  const { folder, onNewFolder } = framed
  const listing = useFolderContents(framed)

  return (
    <>
      <FolderHeaderActions
        onCreate={listing.onCreate}
        onNewFolder={onNewFolder}
      >
        <AskJoriAction target={{ kind: "folder", id: folder.folderId }} />
      </FolderHeaderActions>
      <FolderContents {...listing.contents} />
      {listing.overlays}
    </>
  )
}
