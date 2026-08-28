import { Braces, Pencil } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { JsonBlock, JsonDialog } from "../../shared/code"
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
  const [isSchemaOpen, setIsSchemaOpen] = useState(false)

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
    <>
      <DetailFrame
        action={
          <ValueActions
            onEdit={() => setIsEditing(true)}
            onViewSchema={() => setIsSchemaOpen(true)}
            store={store}
          />
        }
        header={valueHeader(store)}
      >
        <ValueDocument store={store} />
      </DetailFrame>
      <JsonDialog
        description="The schema this store's value must conform to."
        headerLeft={
          <DialogTitle className="font-mono font-normal text-muted-foreground text-xs">
            Schema
          </DialogTitle>
        }
        onOpenChange={setIsSchemaOpen}
        open={isSchemaOpen}
        value={store.schema}
      />
    </>
  )
}

function ValueActions({
  onEdit,
  onViewSchema,
  store,
}: {
  onEdit: () => void
  onViewSchema: () => void
  store: StoreDetail
}) {
  const isArchived = store.archivedAt !== undefined

  return (
    <span className="inline-flex items-center gap-1">
      <CopyButton label="value" value={formatJsonText(store.value)} />
      <ValueActionButton
        disabled={isArchived}
        icon={<Pencil />}
        label="Edit value"
        onClick={onEdit}
      />
      <ValueActionButton
        icon={<Braces />}
        label="View schema"
        onClick={onViewSchema}
      />
    </span>
  )
}

/** Icon-only header action, in the CopyButton idiom: tooltip for sighted
 *  pointers, aria-label for everyone else. */
function ValueActionButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="text-muted-foreground hover:text-foreground"
          disabled={disabled}
          onClick={onClick}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
