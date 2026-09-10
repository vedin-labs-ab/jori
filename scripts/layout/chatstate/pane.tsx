import { type JsonSchemaObject } from "@contracts/schema/validate"
import { type ReactNode, useCallback, useEffect, useMemo } from "react"
import { resolveReference } from "@/landing/demo/derive/chat"
import {
  fileDetail,
  storeDetail,
  storeSummaries,
} from "@/landing/demo/derive/materials"
import { useDemoWorkspace } from "@/landing/demo/workspace"
import { ChatPane } from "@/shared/console/chat/pane"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { usePaneTabs } from "@/shared/console/chat/pane/tabs"
import { type ReferenceTarget } from "@/shared/console/chat/types"
import { delay } from "./service"

export function PaneState({
  children,
  composer,
  state,
}: {
  children: ReactNode
  composer: ReactNode
  state: string
}) {
  const workspace = useDemoWorkspace()
  const { pane, openTarget } = usePaneTabs()
  const target = useMemo<ReferenceTarget>(
    () =>
      state === "pane-file"
        ? { kind: "file", id: "files_notes" }
        : { kind: "store", id: storeSummaries(workspace.state)[0].storeId },
    [state, workspace.state]
  )
  const resolve = useCallback(
    (target: ReferenceTarget) => resolveReference(workspace.state, target),
    [workspace.state]
  )
  const body = useCallback(
    (target: ReferenceTarget) => <MaterialBody target={target} />,
    []
  )
  useEffect(() => {
    const open = (event: KeyboardEvent) => {
      if (event.key === "F7") {
        event.preventDefault()
        void delay().then(() => openTarget(target))
      }
    }
    window.addEventListener("keydown", open)
    return () => window.removeEventListener("keydown", open)
  }, [openTarget, target])
  return (
    <ChatPane
      {...pane}
      body={body}
      composer={composer}
      onHint={undefined}
      resolve={resolve}
    >
      {children}
    </ChatPane>
  )
}

function MaterialBody({ target }: { target: ReferenceTarget }) {
  const { state, actions } = useDemoWorkspace()
  if (target.kind === "file") {
    const file = fileDetail(state, target.id)
    if (!file) {
      throw new Error("Missing pane file fixture")
    }
    return (
      <ChatPaneBody
        material={{
          kind: "file",
          file,
          onSave: async (text) => {
            await delay()
            actions.writeFileText(file.fileId, text)
            return true
          },
        }}
      />
    )
  }
  const store = storeDetail(state, target.id)
  if (!store) {
    throw new Error("Missing pane store fixture")
  }
  return (
    <ChatPaneBody
      material={{
        kind: "store",
        store,
        onWriteSchema: async (schema) => {
          await delay()
          actions.writeStoreSchema(
            store.storeId,
            schema === null ? undefined : (schema as JsonSchemaObject)
          )
        },
        onWriteValue: async (value) => {
          await delay()
          actions.writeStoreValue(store.storeId, value)
        },
      }}
    />
  )
}
