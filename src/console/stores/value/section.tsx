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
import { DetailFrame } from "../../shared/details"
import { formatJsonText } from "../../shared/json/parse"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListContent } from "../../shared/list/frame"
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
      <ConsoleListContent>
        <ValueEditorSection
          onClose={() => setIsEditing(false)}
          organizationId={organizationId}
          store={store}
        />
      </ConsoleListContent>
    )
  }

  return (
    <>
      {/* The value document is the page: the terminal frame bleeds to
          every edge, squared off, with the page's horizontal padding
          carried by its own header and body. */}
      <DetailFrame
        action={
          <ValueActions
            onEdit={() => setIsEditing(true)}
            onViewSchema={() => setIsSchemaOpen(true)}
            store={store}
          />
        }
        className="flex-1 rounded-none"
        contentClassName="h-full"
        headerClassName="px-4 py-2 md:px-6"
      >
        <ValueDocument onEdit={() => setIsEditing(true)} store={store} />
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
