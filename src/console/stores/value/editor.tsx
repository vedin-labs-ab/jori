import { useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import {
  conflictMessage,
  isVersionConflict,
} from "../../shared/materials/conflict"
import { DialogForm } from "../../shared/materials/form"
import { type StoreDetail } from "../types"
import { ValueFields } from "./fields"
import { useValueEditor, type ValueEditor, type ValueEditorView } from "./state"

/** The store value editor: a schema-driven form by default, with a code
 *  view over the raw JSON one toggle away, saved wholesale against the
 *  version it was read at. */
export function ValueEditorSection({
  onClose,
  organizationId,
  store,
}: {
  onClose: () => void
  organizationId: string
  store: StoreDetail
}) {
  const write = useMutation(api.stores.console.writeValue)
  const [isSaving, setIsSaving] = useState(false)
  const editor = useValueEditor({
    hasValue: store.version > 0,
    schema: store.schema,
    value: store.value,
  })

  async function submit() {
    const result = editor.submit()

    if (!result.ok) {
      return
    }

    setIsSaving(true)

    try {
      await write({
        organizationId,
        storeId: store.storeId,
        value: result.value,
        expectedVersion: store.version,
      })
      toast.success("Value saved.")
      onClose()
    } catch (error) {
      if (isVersionConflict(error)) {
        toast.error(conflictMessage("store value"))
      } else {
        showErrorToast(error, "Could not save the value.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DialogForm
      className="gap-2"
      disabled={isSaving}
      onSubmit={() => void submit()}
    >
      <div className="flex items-center justify-between">
        <Label>Value</Label>
        <Tabs
          onValueChange={(view) => editor.switchView(view as ValueEditorView)}
          value={editor.state.view}
        >
          <TabsList className="!h-7">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {editor.state.view === "form" && editor.form !== undefined ? (
        <ValueFields
          errors={editor.state.fieldErrors}
          form={editor.form}
          onChange={editor.setRoot}
          root={editor.state.root}
        />
      ) : (
        <ValueCodeView editor={editor} />
      )}
      <div className="flex items-center gap-2">
        <Button disabled={isSaving} type="submit">
          {isSaving ? <Loader2 className="animate-spin" /> : null}
          Save value
        </Button>
        <Button
          disabled={isSaving}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </DialogForm>
  )
}

function ValueCodeView({ editor }: { editor: ValueEditor }) {
  return (
    <>
      <Textarea
        aria-label="Store value JSON"
        className="min-h-64 font-mono text-xs"
        onChange={(event) => editor.setCodeText(event.target.value)}
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
