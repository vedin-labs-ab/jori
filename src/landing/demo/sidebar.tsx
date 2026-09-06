import { useState } from "react"
import { FolderTree } from "@/shared/console/folders/section"
import { activeFolderId } from "@/shared/console/folders/tree"
import {
  type CreationRequest,
  type FolderDialogRequest,
} from "@/shared/console/folders/types"
import { ConsoleSidebar } from "@/shared/console/shell/navigation"
import { SidebarOrganization } from "@/shared/console/shell/organization"
import { DemoCreationDialogs } from "./dialogs/creation"
import { DemoFolderDialogs } from "./dialogs/folders"
import { useDemoExpansion } from "./expansion"
import { organization } from "./fixtures/organization"
import { useDemoFolders, useDemoWorkspace } from "./workspace"

/** The console's sidebar over the workspace: Copperline at its head, the
 *  navigation, and the folder tree with the dialogs its rows raise. */
export function DemoSidebar({ pathname }: { pathname: string }) {
  const folders = useDemoFolders()
  const { state } = useDemoWorkspace()
  const expansion = useDemoExpansion(activeFolderId(pathname), folders)
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const [creation, setCreation] = useState<CreationRequest>()

  return (
    <>
      <ConsoleSidebar
        account={null}
        chats={state.chat.conversations}
        folders={
          <FolderTree
            expansion={expansion}
            folders={folders}
            onCreate={setCreation}
            onDialog={setDialog}
            onNewFolder={() => setDialog({ type: "create" })}
            pathname={pathname}
          />
        }
        organization={<SidebarOrganization organization={organization} />}
        pathname={pathname}
      />
      <DemoFolderDialogs dialog={dialog} onClose={() => setDialog(undefined)} />
      <DemoCreationDialogs
        onClose={() => setCreation(undefined)}
        request={creation}
      />
    </>
  )
}
