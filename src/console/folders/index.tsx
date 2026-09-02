import { useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { CreationDialogs, type FolderCreation } from "./create/dialogs"
import { NewInFolderMenu } from "./create/menu"
import { FolderFrame, type FramedFolder } from "./frame"
import { FolderHeaderActions } from "./header"
import { useFolderResourceActions } from "./list/actions"
import { FolderContents } from "./list/contents"

/** A folder's page: everything filed here. */
export function FolderPage({ folderId }: { folderId: string }) {
  return (
    <FolderFrame folderId={folderId} view="contents">
      {(framed) => <FolderContentsView framed={framed} />}
    </FolderFrame>
  )
}

function FolderContentsView({ framed }: { framed: FramedFolder }) {
  const { folder, onDialog, onNewFolder, organizationId } = framed
  const contents = useQuery(api.folders.console.contents, {
    organizationId,
    folderId: folder.folderId,
  })
  const [creation, setCreation] = useState<FolderCreation>()
  const resources = useFolderResourceActions({
    contents,
    folder,
    organizationId,
  })

  return (
    <>
      <FolderHeaderActions onCreate={setCreation} onNewFolder={onNewFolder} />
      <FolderContents
        actions={resources.actions}
        contents={contents}
        folderId={folder.folderId}
        newMenu={
          <NewInFolderMenu onCreate={setCreation} onNewFolder={onNewFolder}>
            <Button type="button">
              <Plus />
              New
            </Button>
          </NewInFolderMenu>
        }
        onDialog={onDialog}
      />
      <CreationDialogs
        onClose={() => setCreation(undefined)}
        organizationId={organizationId}
        request={
          creation === undefined
            ? undefined
            : { creation, folderId: folder.folderId }
        }
      />
      {resources.dialogs}
    </>
  )
}
