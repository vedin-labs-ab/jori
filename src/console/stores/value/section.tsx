import { Braces, Database } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { JsonBlock } from "../../shared/code"
import { CopyButton } from "../../shared/copy"
import { formatJsonText } from "../../shared/json/parse"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListContent } from "../../shared/list/frame"
import { StoreSchemaDialog } from "../schema/dialog"
import { type StoreDetail } from "../types"
import { ValueEditorSection } from "./editor"
import { StoreToolbar } from "./toolbar"

/** The store's value under the store toolbar. The editor IS the page —
 *  it renders the toolbar itself, so the view toggle and save status live
 *  in the header. Archived stores fall back to a read-only document under
 *  a plain toolbar. */
export function StoreValue({
  organizationId,
  store,
}: {
  organizationId: string
  store: StoreDetail
}) {
  const [isSchemaOpen, setIsSchemaOpen] = useState(false)
  const tools = (
    <>
      <ValueActionButton
        icon={<Braces />}
        label={store.schema === undefined ? "Add schema" : "Schema"}
        onClick={() => setIsSchemaOpen(true)}
      />
      <CopyButton label="value" value={formatJsonText(store.value)} />
    </>
  )

  return (
    <>
      {store.archivedAt === undefined ? (
        <ValueEditorSection
          key={store.storeId}
          organizationId={organizationId}
          store={store}
          tools={tools}
        />
      ) : (
        <>
          <StoreToolbar store={store} tools={tools} />
          <ConsoleListContent>
            <ArchivedValue store={store} />
          </ConsoleListContent>
        </>
      )}
      <StoreSchemaDialog
        onOpenChange={setIsSchemaOpen}
        organizationId={organizationId}
        store={isSchemaOpen ? store : undefined}
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
