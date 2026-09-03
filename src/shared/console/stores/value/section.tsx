import { Braces, Database, Plus } from "lucide-react"
import { type ReactNode, useCallback, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { JsonBlock } from "@/shared/console/code"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { ConsoleListContent } from "@/shared/console/list/frame"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { StoreMenuItems } from "../menu"
import { type SchemaWrite, StoreSchemaDialog } from "../schema/dialog"
import { type StoreDetail } from "../types"
import {
  ValueEditorSection,
  type ValueEditorState,
  type ValueWrite,
} from "./editor"

/** The store's value as the whole page. The page's chrome hangs off the
 *  store's name in the breadcrumb: the view the value is read in, the
 *  schema, a copy, and the actions every material shares, which the host
 *  supplies as the menu around this view's own items. A store the console
 *  does not edit — schemaless or archived — reads as a document. */
export function StoreValue({
  onWriteSchema,
  onWriteValue,
  store,
  titleMenu,
}: {
  /** Replaces the store's schema; null removes it. A rejection's message
   *  surfaces under the schema editor. */
  onWriteSchema: SchemaWrite
  onWriteValue: ValueWrite
  store: StoreDetail
  /** The menu hung off the store's name, given this view's items to lead
   *  with. */
  titleMenu: (lead: ReactNode) => ReactNode
}) {
  const [isSchemaOpen, setIsSchemaOpen] = useState(false)
  const [editor, setEditor] = useState<ValueEditorState>()
  const openSchema = useCallback(() => setIsSchemaOpen(true), [])
  // An archived store refuses writes, so its schema builds no form.
  const schema = store.archivedAt === undefined ? store.schema : undefined
  const isEditable = schema !== undefined

  useStoreCrumb({
    menu: titleMenu(
      <StoreMenuItems
        onSchema={openSchema}
        onViewChange={editor?.switchView}
        store={store}
        view={isEditable ? editor?.view : undefined}
      />
    ),
    saveStatus: isEditable ? editor?.saveStatus : undefined,
    store,
  })

  return (
    <>
      {schema !== undefined ? (
        <ValueEditorSection
          key={store.storeId}
          onState={setEditor}
          onWrite={onWriteValue}
          schema={schema}
          store={store}
        />
      ) : (
        <ConsoleListContent>
          <ReadOnlyValue onAddSchema={openSchema} store={store} />
        </ConsoleListContent>
      )}
      <StoreSchemaDialog
        onOpenChange={setIsSchemaOpen}
        onWrite={onWriteSchema}
        store={isSchemaOpen ? store : undefined}
      />
    </>
  )
}

/** Publishes the store's crumb: its name with the menu hung off it, and
 *  the save state the shell shows in the name while a save is in motion. */
function useStoreCrumb({
  menu,
  saveStatus,
  store,
}: {
  menu: ReactNode
  saveStatus: ValueEditorState["saveStatus"] | undefined
  store: StoreDetail
}) {
  useMaterialTrail(
    useMemo(
      () => ({ menu, name: store.name, saveStatus }),
      [menu, saveStatus, store.name]
    )
  )
}

/** The value of a store the console does not edit: an archived store,
 *  which refuses writes, or a schemaless one, which has no form to build.
 *  Whatever was written still reads as the document it is; an unwritten
 *  store says why, and a schema is the way out. */
function ReadOnlyValue({
  onAddSchema,
  store,
}: {
  onAddSchema: () => void
  store: StoreDetail
}) {
  if (store.version > 0) {
    return <JsonBlock className="max-h-none" value={store.value} />
  }

  if (store.archivedAt !== undefined) {
    return (
      <ConsoleEmptyState
        className="h-full"
        description="The first write creates version 1. Restore the store to write it."
        icon={Database}
        title="Nothing stored yet"
      />
    )
  }

  return (
    <ConsoleEmptyState
      action={
        <Button onClick={onAddSchema} type="button">
          <Plus />
          Add schema
        </Button>
      }
      className="h-full"
      description="A schema gives this store an editable form. Without one, only agents and the API write the value."
      icon={Braces}
      title="No schema yet"
    />
  )
}
