import { useMutation } from "convex/react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "../../../../convex/_generated/api"
import {
  conflictMessage,
  isVersionConflict,
} from "../../shared/materials/conflict"
import { type StoreDetail } from "../types"
import {
  useValueAutosave,
  type ValueSaveOutcome,
  type ValueSaveStatus,
} from "./autosave"
import { ValueFields } from "./fields"
import { useValueEditor, type ValueEditor, type ValueEditorView } from "./state"

/** The store value editor is the page: a schema-driven form (or the raw
 *  JSON one toggle away) that saves itself — debounced, validated first,
 *  wholesale against the version it last saw. The toolbar meta carries
 *  the save status; there is nothing to press. */
export function ValueEditorSection({
  onStatus,
  organizationId,
  store,
}: {
  onStatus: (status: ValueSaveStatus) => void
  organizationId: string
  store: StoreDetail
}) {
  const write = useMutation(api.stores.console.writeValue)
  const editor = useValueEditor({
    hasValue: store.version > 0,
    schema: store.schema,
    value: store.value,
  })
  const versionRef = useRef(store.version)

  const performRef = useRef<() => Promise<ValueSaveOutcome>>(
    async () => "invalid"
  )

  performRef.current = async () => {
    const result = editor.submit()

    if (!result.ok) {
      return "invalid"
    }

    try {
      await write({
        organizationId,
        storeId: store.storeId,
        value: result.value,
        expectedVersion: versionRef.current,
      })
      // Writes bump the version by one; tracking it locally keeps rapid
      // follow-up saves ahead of the subscription's round-trip.
      versionRef.current += 1

      return "saved"
    } catch (error) {
      if (isVersionConflict(error)) {
        toast.error(conflictMessage("store value"))

        return "conflict"
      }

      throw error
    }
  }

  const autosave = useValueAutosave(() => performRef.current(), onStatus)

  useExternalReseed(store, editor, versionRef, autosave.isBusy)

  return (
    <div className="flex flex-col gap-2">
      <Tabs
        onValueChange={(view) => editor.switchView(view as ValueEditorView)}
        value={editor.state.view}
      >
        <TabsList className="!h-7">
          <TabsTrigger value="form">Form</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
      </Tabs>
      {editor.state.view === "form" && editor.form !== undefined ? (
        <ValueFields
          errors={editor.state.fieldErrors}
          form={editor.form}
          onChange={(root, editedPath) => {
            editor.setRoot(root, editedPath)
            autosave.change()
          }}
          root={editor.state.root}
        />
      ) : (
        <ValueCodeView editor={editor} onEdit={autosave.change} />
      )}
    </div>
  )
}

/** A write that landed elsewhere — another tab, an agent — reseeds the
 *  editor, but only while nothing local is typed or in flight; local work
 *  is never clobbered, it just wins or conflicts on its own save. */
function useExternalReseed(
  store: StoreDetail,
  editor: ValueEditor,
  versionRef: { current: number },
  isBusy: () => boolean
) {
  const editorRef = useRef(editor)

  editorRef.current = editor

  useEffect(() => {
    if (store.version !== versionRef.current && !isBusy()) {
      versionRef.current = store.version
      editorRef.current.reset(store.value, store.version > 0)
    }
  }, [store.version, store.value, versionRef, isBusy])
}

function ValueCodeView({
  editor,
  onEdit,
}: {
  editor: ValueEditor
  onEdit: () => void
}) {
  return (
    <>
      <Textarea
        aria-label="Store value JSON"
        className="min-h-64 font-mono text-xs"
        onChange={(event) => {
          editor.setCodeText(event.target.value)
          onEdit()
        }}
        value={editor.state.codeText}
      />
      {editor.state.codeError === undefined ? null : (
        <p className="text-destructive text-xs" role="alert">
          {editor.state.codeError}
        </p>
      )}
      {editor.state.codeNote === undefined ? null : (
        <p className="text-muted-foreground text-xs">{editor.state.codeNote}</p>
      )}
    </>
  )
}
