import { useFile } from "@/console/files/query"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { type FileDetail } from "@/shared/console/files/types"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { useFileSave } from "../../files/save"

/** A file in the pane: its body over the same save its page uses, with
 *  no neighbors to step to. */
export function PaneFile({
  id,
  organizationId,
}: {
  id: string
  organizationId: string
}) {
  const result = useFile(organizationId, id)

  if (result === undefined) {
    return <ConsoleListLoading />
  }

  if (result.status !== "ready" || result.file === null) {
    return null
  }

  return <PaneBody file={result.file} organizationId={organizationId} />
}

function PaneBody({
  file,
  organizationId,
}: {
  file: FileDetail
  organizationId: string
}) {
  const save = useFileSave(organizationId, file)

  return (
    <ChatPaneBody
      material={{
        kind: "file",
        file,
        onSave: save,
      }}
    />
  )
}
