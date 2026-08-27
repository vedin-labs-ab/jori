import { Pencil } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { JsonBlock } from "../../shared/code"
import { CopyButton } from "../../shared/copy"
import { DetailFrame } from "../../shared/details"
import { formatJsonText } from "../../shared/json/parse"
import { type StoreDetail } from "../types"
import { ValueEditorSection } from "./editor"

/** The store's current value: a formatted JSON document with an edit mode
 *  that replaces it wholesale, guarded by the version it was read at. */
export function StoreValue({
  organizationId,
  store,
}: {
  organizationId: string
  store: StoreDetail
}) {
  const [isEditing, setIsEditing] = useState(false)
  const isArchived = store.archivedAt !== undefined

  if (isEditing) {
    return (
      <ValueEditorSection
        header={valueHeader(store)}
        onClose={() => setIsEditing(false)}
        organizationId={organizationId}
        store={store}
      />
    )
  }

  return (
    <DetailFrame
      action={
        <span className="inline-flex items-center gap-1">
          <CopyButton label="value" value={formatJsonText(store.value)} />
          <Button
            disabled={isArchived}
            onClick={() => setIsEditing(true)}
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
