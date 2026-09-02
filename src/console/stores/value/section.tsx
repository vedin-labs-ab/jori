import { Braces, Database, Plus } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { JsonBlock } from "@/shared/console/code"
import { CopyButton } from "@/shared/console/copy"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { ConsoleListContent } from "@/shared/console/list/frame"
import { type StoreDetail } from "@/shared/console/stores/types"
import { formatJsonText } from "../json"
import { StoreSchemaDialog } from "../schema/dialog"
import { ValueEditorSection } from "./editor"
import { StoreToolbar } from "./toolbar"

/** The store's value under the store toolbar. The editor IS the page —
 *  it renders the toolbar itself, so the view toggle and save status live
 *  in the header. A store the console does not edit — schemaless or
 *  archived — falls back to a read-only document under a plain
 *  toolbar. */
export function StoreValue({
  organizationId,
  store,
}: {
  organizationId: string
  store: StoreDetail
}) {
  const [isSchemaOpen, setIsSchemaOpen] = useState(false)
  const openSchema = () => setIsSchemaOpen(true)
  const tools = (
    <>
      <ValueActionButton
        icon={<Braces />}
        label={store.schema === undefined ? "Add schema" : "Schema"}
        onClick={openSchema}
      />
      <CopyButton label="value" value={formatJsonText(store.value)} />
    </>
  )

  return (
    <>
      {store.schema !== undefined && store.archivedAt === undefined ? (
        <ValueEditorSection
          key={store.storeId}
          organizationId={organizationId}
          schema={store.schema}
          store={store}
          tools={tools}
        />
      ) : (
        <>
          <StoreToolbar store={store} tools={tools} />
          <ConsoleListContent>
            <ReadOnlyValue onAddSchema={openSchema} store={store} />
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
