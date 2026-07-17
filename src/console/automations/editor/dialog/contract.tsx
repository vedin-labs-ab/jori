import { Database } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ContractEntrySummary = {
  name: string
  scope: string
  description: string | undefined
  schemaName: string
  schemaVersion: number
  schema: unknown
}

/**
 * Contract entries as quiet rows; each name opens the JSON Schema the
 * server validates every state write against — the same compiled contract
 * the runtime enforces, so there is nothing separate to drift.
 */
export function ContractEntryRows({
  entries,
}: {
  entries: ContractEntrySummary[]
}) {
  const [revealed, setRevealed] = useState<ContractEntrySummary>()

  return (
    <>
      {entries.map((entry) => (
        <div className="flex min-w-0 items-start gap-1.5" key={entry.name}>
          <Database className="mt-px size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate" title={entry.description}>
            <button
              aria-label={`View the ${entry.name} schema`}
              className="font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() => setRevealed(entry)}
              type="button"
            >
              {entry.name}
            </button>
            <span className="text-muted-foreground">
              {" "}
              · {entry.scope}
              {entry.description === undefined ? "" : ` — ${entry.description}`}
            </span>
          </span>
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
    </>
  )
}

function SchemaDialog({
  entry,
  onOpenChange,
}: {
  entry: ContractEntrySummary | undefined
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={entry !== undefined}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{entry?.name}</DialogTitle>
          <DialogDescription>
            {entry === undefined
              ? ""
              : `${entry.scope} · ${entry.schemaName} v${entry.schemaVersion} — every state write is validated against this JSON Schema.`}
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted/40 p-3 text-xs">
          {entry === undefined ? "" : JSON.stringify(entry.schema, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  )
}
