import { Braces } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExpandableText } from "@/components/ui/expandable-text"
import { CopyButton } from "../../../shared/copy"

export type ContractEntrySummary = {
  name: string
  scope: string
  description: string | undefined
  schemaName: string
  schemaVersion: number
  schema: unknown
}

/**
 * The artifact's state contract, subordinate to the artifact card above it:
 * one expandable line per entry, with the enforced JSON Schema one click
 * away — the same compiled contract the runtime validates against, so
 * there is nothing separate to drift.
 */
export function ContractEntries({
  entries,
}: {
  entries: ContractEntrySummary[]
}) {
  const [revealed, setRevealed] = useState<ContractEntrySummary>()

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="grid min-w-0 gap-2">
      <p className="font-medium text-muted-foreground">State</p>
      {entries.map((entry) => (
        <div className="grid min-w-0 gap-0.5" key={entry.name}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              <span className="font-medium text-foreground">{entry.name}</span>
              <span className="text-muted-foreground"> · {entry.scope}</span>
            </span>
            <Button
              aria-label={`View the ${entry.name} schema`}
              className="shrink-0"
              onClick={() => setRevealed(entry)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Braces /> Schema
            </Button>
          </div>
          {entry.description === undefined ? null : (
            <ExpandableText
              className="min-w-0 text-muted-foreground"
              maxLines={1}
            >
              {entry.description}
            </ExpandableText>
          )}
        </div>
      ))}
      <SchemaDialog
        entry={revealed}
        onOpenChange={(open) => {
          if (!open) {
            setRevealed(undefined)
          }
        }}
      />
    </div>
  )
}

/** Bare JSON viewer, mirroring the runs error dialog: no chrome beyond a
 *  copy control — the schema is the whole story. */
function SchemaDialog({
  entry,
  onOpenChange,
}: {
  entry: ContractEntrySummary | undefined
  onOpenChange: (open: boolean) => void
}) {
  const json = entry === undefined ? "" : JSON.stringify(entry.schema, null, 2)

  return (
    <Dialog onOpenChange={onOpenChange} open={entry !== undefined}>
      <DialogContent
        // Full-bleed: the copy-row divider spans the card, the pre scrolls.
        bodyClassName="gap-0 p-0"
        className="bg-muted sm:max-w-3xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {entry?.name} state schema
        </DialogTitle>
        <DialogDescription className="sr-only">
          The JSON Schema every write to this state entry is validated against.
        </DialogDescription>
        <div className="grid min-w-0 overflow-hidden">
          <div className="flex min-w-0 items-center justify-end border-b px-3 py-2">
            <CopyButton label="schema" value={json} />
          </div>
          <pre className="max-h-[70vh] min-w-0 overflow-auto px-3 py-2 font-mono text-foreground text-xs leading-relaxed">
            <code className="block whitespace-pre-wrap break-words">
              {json}
            </code>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
