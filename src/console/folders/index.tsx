import { useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { NewInFolderMenu } from "@/shared/console/folders/create"
import { FolderHeaderActions } from "@/shared/console/folders/header"
import { FolderContents } from "@/shared/console/folders/list/contents"
import { type FolderCreation } from "@/shared/console/folders/types"
import { api } from "../../../convex/_generated/api"
import { CreationDialogs } from "./create/dialogs"
import { FolderFrame, type FramedFolder } from "./frame"
import { useFolderResourceActions } from "./list/actions"
import { ResourceRowMenu } from "./list/menu"

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
        resourceMenu={(resource) => (
          <ResourceRowMenu actions={resources.actions} resource={resource} />
        )}
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
