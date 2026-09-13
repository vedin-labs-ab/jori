import {
  type JsonSchemaObject,
  validateJsonSchemaValue,
} from "@contracts/schema/validate"
import { ClientOnly } from "@tanstack/react-router"
import { type ReactNode, useMemo, useState } from "react"
import { AskJoriAction } from "@/shared/console/chat/pane/ask"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { MaterialHeaderActions } from "@/shared/console/materials/detail/header"
import { exportStoreJson } from "@/shared/console/stores/export"
import { type SchemaWrite } from "@/shared/console/stores/schema/dialog"
import { type StoreDetail } from "@/shared/console/stores/types"
import { StoreValue } from "@/shared/console/stores/value/section"
import { VisibilityButton } from "@/shared/console/visibility/badge"
import { materialOf, storeDetail } from "../../derive/materials"
import { DemoLinksDialog } from "../../dialogs/links"
import { MaterialDialogs, type MaterialRequest } from "../../dialogs/materials"
import { useDemoWorkspace } from "../../workspace"
import { CollectionMenu, MaterialMissing } from "./chrome"

/** One store's page over the workspace: the console's value editor,
 *  saving into memory, under the header actions and the crumb the
 *  console gives a store. The editor mounts on the client only: its code
 *  view is CodeMirror. */
export function StorePage({ storeId }: { storeId: string }) {
  const { actions, state } = useDemoWorkspace()
  const material = materialOf(state, storeId)
  const store = useMemo(() => storeDetail(state, storeId), [state, storeId])
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [request, setRequest] = useState<MaterialRequest>()

  if (store === undefined || material?.kind !== "store") {
    return <MaterialMissing noun="store" />
  }

  const titleMenu = (lead: ReactNode) => (
    <CollectionMenu lead={lead} material={material} onRequest={setRequest} />
  )

  return (
    <ConsoleListLayout>
      <MaterialHeaderActions
        canExport={store.version > 0}
        onExport={() => exportStoreJson(store)}
        onShare={() => setIsShareOpen(true)}
      >
        <AskJoriAction target={{ kind: "store", id: store.storeId }} />
      </MaterialHeaderActions>
      <ClientOnly fallback={<ConsoleListLoading />}>
        <StoreValue
          audience={
            <VisibilityButton
              {...store}
              onClick={() => setRequest({ kind: "access", material })}
            />
          }
          onWriteSchema={schemaWrite(store, actions.writeStoreSchema)}
          onWriteValue={(value) => {
            actions.writeStoreValue(store.storeId, value)

            return Promise.resolve()
          }}
          store={store}
          titleMenu={titleMenu}
        />
      </ClientOnly>
      <DemoLinksDialog
        kind="store"
        materialId={store.storeId}
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

/** A schema the current value violates is refused, in the words the
 *  backend refuses it with, so the dialog shows the same mismatches. */
function schemaWrite(
  store: StoreDetail,
  write: (storeId: string, schema: JsonSchemaObject | undefined) => void
): SchemaWrite {
  return (schema) => {
    if (schema === null) {
      write(store.storeId, undefined)

      return Promise.resolve()
    }

    const issues =
      store.version > 0
        ? validateJsonSchemaValue(
            schema as JsonSchemaObject,
            store.value,
            "value"
          )
        : []

    if (issues.length > 0) {
      const detail = issues
        .slice(0, 5)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")

      return Promise.reject(
        new Error(
          `The current value does not satisfy this schema (${detail}). Fix the value or adjust the schema, then save again.`
        )
      )
    }

    write(store.storeId, schema as JsonSchemaObject)

    return Promise.resolve()
  }
}
