import { Braces, Database } from "lucide-react"
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
import { type ValueSaveStatus } from "./autosave"
import { ValueEditorSection } from "./editor"
import { StoreToolbar } from "./toolbar"

/** The store's value under the store toolbar. The editor IS the page —
 *  the form (or code) view saves itself like the file editor does, with
 *  the toolbar meta carrying the save status. Archived stores fall back
 *  to a read-only document. */
export function StoreValue({
  organizationId,
  store,
}: {
  organizationId: string
  store: StoreDetail
}) {
  const [isSchemaOpen, setIsSchemaOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<ValueSaveStatus>("idle")
  const isArchived = store.archivedAt !== undefined

  return (
    <>
      <StoreToolbar
        saveStatus={isArchived ? undefined : saveStatus}
        store={store}
        tools={
          <>
            <ValueActionButton
              icon={<Braces />}
              label="View schema"
              onClick={() => setIsSchemaOpen(true)}
            />
            <CopyButton label="value" value={formatJsonText(store.value)} />
          </>
        }
      />
      <ConsoleListContent>
        {isArchived ? (
          <ArchivedValue store={store} />
        ) : (
          <ValueEditorSection
            key={store.storeId}
            onStatus={setSaveStatus}
            organizationId={organizationId}
            store={store}
          />
        )}
      </ConsoleListContent>
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

/** Icon-only toolbar action, in the CopyButton idiom: tooltip for sighted
 *  pointers, aria-label for everyone else. */
function ValueActionButton({
  icon,
  label,
  onClick,
}: {
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

/** Archived stores block writes, so the value shows as the read-only
 *  document it is. */
function ArchivedValue({ store }: { store: StoreDetail }) {
  if (store.version === 0) {
    return (
      <ConsoleEmptyState
        className="h-full"
        description="The first write creates version 1. Restore the store to write it."
        icon={Database}
        title="Nothing stored yet"
      />
    )
  }

  return <JsonBlock className="max-h-none" value={store.value} />
}
