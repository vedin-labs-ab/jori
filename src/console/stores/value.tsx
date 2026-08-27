import { useMutation } from "convex/react"
import { Loader2, Pencil } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { api } from "../../../convex/_generated/api"
import { JsonBlock } from "../shared/code"
import { CopyButton } from "../shared/copy"
import { DetailFrame } from "../shared/details"
import { showErrorToast } from "../shared/error"
import { formatJsonText, parseJsonText } from "../shared/json/parse"
import {
  conflictMessage,
  isVersionConflict,
} from "../shared/materials/conflict"
import { type StoreDetail } from "./types"

/** The store's current value: a formatted JSON document with an edit mode
 *  that replaces it wholesale, guarded by the version it was read at. */
export function StoreValue({
  organizationId,
  store,
}: {
  organizationId: string
  store: StoreDetail
}) {
  const [draft, setDraft] = useState<string>()
  const isArchived = store.archivedAt !== undefined

  if (draft === undefined) {
    return (
      <DetailFrame
        action={
          <span className="inline-flex items-center gap-1">
            <CopyButton label="value" value={formatJsonText(store.value)} />
            <Button
              disabled={isArchived}
              onClick={() =>
                setDraft(
                  store.version === 0 ? "{}" : formatJsonText(store.value)
                )
              }
              size="sm"
              type="button"
              variant="ghost"
            >
              <Pencil />
              Edit
            </Button>
          </span>
        }
        header={valueHeader(store)}
      >
        <ValueDocument store={store} />
      </DetailFrame>
    )
  }

  return (
    <ValueEditor
      draft={draft}
      onClose={() => setDraft(undefined)}
      onDraftChange={setDraft}
      organizationId={organizationId}
      store={store}
    />
  )
}

function valueHeader(store: StoreDetail) {
  return store.version === 0
    ? "Value · not written yet"
    : `Value · v${store.version}`
}

function ValueDocument({ store }: { store: StoreDetail }) {
  if (store.version === 0) {
    return (
      <p className="px-2.5 py-2 text-muted-foreground text-xs">
        Nothing stored yet. The first write creates version 1.
      </p>
    )
  }

  return <JsonBlock value={store.value} />
}

function ValueEditor({
  draft,
  onClose,
  onDraftChange,
  organizationId,
  store,
}: {
  draft: string
  onClose: () => void
  onDraftChange: (draft: string) => void
  organizationId: string
  store: StoreDetail
}) {
  const write = useMutation(api.stores.console.writeValue)
  const [isSaving, setIsSaving] = useState(false)
  const parsed = parseJsonText(draft)

  async function submit() {
    if (!parsed.ok) {
      return
    }

    setIsSaving(true)

    try {
      await write({
        organizationId,
        storeId: store.storeId,
        value: parsed.value,
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
    <div className="grid gap-2">
      <DetailFrame header={valueHeader(store)}>
        <Textarea
          aria-label="Store value JSON"
          className="min-h-64 rounded-none border-0 font-mono text-xs focus-visible:ring-0"
          onChange={(event) => onDraftChange(event.target.value)}
          value={draft}
        />
      </DetailFrame>
      {parsed.ok ? null : (
        <p className="text-destructive text-xs">{parsed.error}</p>
      )}
      <div className="flex items-center gap-2">
        <Button
          disabled={!parsed.ok || isSaving}
          onClick={() => void submit()}
          type="button"
        >
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
    </div>
  )
}
