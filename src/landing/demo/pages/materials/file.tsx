import { ClientOnly } from "@tanstack/react-router"
import { type ReactNode, useMemo, useState } from "react"
import { AskJoriAction } from "@/shared/console/chat/pane/ask"
import { FileBody } from "@/shared/console/files/body"
import { FileHeaderActions } from "@/shared/console/files/header"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { fileDetail, fileSiblingsOf, materialOf } from "../../derive/materials"
import { DemoLinksDialog } from "../../dialogs/links"
import { MaterialDialogs, type MaterialRequest } from "../../dialogs/materials"
import { useDemoWorkspace } from "../../workspace"
import { FileMenu, MaterialMissing } from "./chrome"

/** One file's page over the workspace: the console's viewer or editor,
 *  with edits saved into memory, under the header actions and the crumb
 *  the console gives a file. The body mounts on the client only: it
 *  fetches the file and hands media object URLs. */
export function FilePage({ fileId }: { fileId: string }) {
  const { actions, state } = useDemoWorkspace()
  const material = materialOf(state, fileId)
  const file = useMemo(() => fileDetail(state, fileId), [state, fileId])
  const siblings = useMemo(() => fileSiblingsOf(state, fileId), [state, fileId])
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [request, setRequest] = useState<MaterialRequest>()

  if (file === undefined || material?.kind !== "file") {
    return <MaterialMissing noun="file" />
  }

  const titleMenu = (lead: ReactNode) => (
    <FileMenu lead={lead} material={material} onRequest={setRequest} />
  )

  return (
    <ConsoleListLayout>
      <FileHeaderActions
        name={file.name}
        onShare={() => setIsShareOpen(true)}
        url={file.url}
      >
        <AskJoriAction target={{ kind: "file", id: file.fileId }} />
      </FileHeaderActions>
      <ClientOnly fallback={<ConsoleListLoading />}>
        <FileBody
          file={file}
          onSave={(text) => {
            actions.writeFileText(file.fileId, text)

            return Promise.resolve(true)
          }}
          siblings={siblings}
          titleMenu={titleMenu}
        />
      </ClientOnly>
      <DemoLinksDialog
        kind="file"
        materialId={file.fileId}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
      />
      <MaterialDialogs
        onClose={() => setRequest(undefined)}
        request={request}
      />
    </ConsoleListLayout>
  )
}
