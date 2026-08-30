import { Braces, Database, Pencil } from "lucide-react"
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
import { formatJsonText } from "../../shared/json/parse"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListContent } from "../../shared/list/frame"
import { type StoreDetail } from "../types"
import { ValueEditorSection } from "./editor"
import { StoreToolbar } from "./toolbar"

/** The store's current value under the store toolbar: a formatted JSON
 *  document with an edit mode that replaces it wholesale, guarded by the
 *  version it was read at. The toolbar carries the value tools and stays
 *  mounted across both modes. */
export function StoreValue({
  organizationId,
  store,
}: {
  organizationId: string
  store: StoreDetail
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSchemaOpen, setIsSchemaOpen] = useState(false)

  return (
    <>
      <StoreToolbar
        store={store}
        tools={
          <ValueActions
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onViewSchema={() => setIsSchemaOpen(true)}
            store={store}
          />
        }
      />
      {isEditing ? (
        <ConsoleListContent>
          <ValueEditorSection
            onClose={() => setIsEditing(false)}
            organizationId={organizationId}
            store={store}
          />
        </ConsoleListContent>
      ) : (
        // The value document is the page: the terminal surface bleeds to
        // every edge below the toolbar, body only — the toolbar above
        // carries what used to be its header.
        <div className="min-h-0 flex-1 overflow-hidden bg-muted">
          <ValueDocument onEdit={() => setIsEditing(true)} store={store} />
        </div>
      )}
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

/** The value tools, in the toolbar's compact ghost idiom: inspect the
 *  schema, copy the saved value, and enter edit mode — disabled while the
 *  editor is open or the store is archived. */
function ValueActions({
  isEditing,
  onEdit,
  onViewSchema,
  store,
}: {
  isEditing: boolean
  onEdit: () => void
  onViewSchema: () => void
  store: StoreDetail
}) {
  return (
    <>
      <ValueActionButton
        icon={<Braces />}
        label="View schema"
        onClick={onViewSchema}
      />
      <CopyButton label="value" value={formatJsonText(store.value)} />
      <ValueActionButton
        disabled={isEditing || store.archivedAt !== undefined}
        icon={<Pencil />}
        label="Edit value"
        onClick={onEdit}
      />
    </>
  )
}

/** Icon-only toolbar action, in the CopyButton idiom: tooltip for sighted
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

function ValueDocument({
  onEdit,
  store,
}: {
  onEdit: () => void
  store: StoreDetail
}) {
  if (store.version === 0) {
    return (
      <ConsoleEmptyState
        action={
          store.archivedAt === undefined ? (
            <Button onClick={onEdit} type="button">
              <Pencil />
              Write value
            </Button>
          ) : undefined
        }
        className="h-full"
        description="The first write creates version 1. Jori writes it from runs, or you can start it here."
        icon={Database}
        title="Nothing stored yet"
      />
    )
  }

  return (
    <JsonBlock
      className="h-full max-h-none px-4 py-3 md:px-6"
      value={store.value}
    />
  )
}
