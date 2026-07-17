import { Link2, Lock, type LucideIcon } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExpandableText } from "@/components/ui/expandable-text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { JsonView } from "../../../shared/code"
import { CopyButton } from "../../../shared/copy"
import { useRetained } from "../../../shared/retain"
import { codeTokenClassName } from "../../../shared/tokens"

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
        <ContractEntryRow
          entry={entry}
          key={entry.name}
          onReveal={() => setRevealed(entry)}
        />
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

/** The entry itself is the schema trigger; hovering underlines the name. */
function ContractEntryRow({
  entry,
  onReveal,
}: {
  entry: ContractEntrySummary
  onReveal: () => void
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <button
        aria-label={`View the ${entry.name} schema`}
        className="group/schema flex min-w-0 items-center gap-1.5 justify-self-start rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        onClick={onReveal}
        type="button"
      >
        <span className="min-w-0 truncate font-medium text-foreground underline-offset-2 group-hover/schema:underline">
          {entry.name}
        </span>
        <ScopeMark scope={entry.scope} />
      </button>
      {entry.description === undefined ? null : (
        <ExpandableText className="min-w-0 text-muted-foreground" maxLines={1}>
          {entry.description}
        </ExpandableText>
      )}
    </div>
  )
}

const scopeMarks: Record<
  string,
  { icon: LucideIcon; label: string; explanation: string }
> = {
  personal: {
    explanation: "One document per person. Never visible through share links.",
    icon: Lock,
    label: "Private",
  },
  shared: {
    explanation:
      "One document for the whole artifact. Everyone who can open it sees the same data, and share links can too.",
    icon: Link2,
    label: "Shareable",
  },
}

function ScopeMark({ scope }: { scope: string }) {
  const mark = scopeMarks[scope]

  if (mark === undefined) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex shrink-0 items-center text-muted-foreground">
          <mark.icon aria-label={mark.label} className="size-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-56">
        {/* One flex child: the tooltip card lays children out in a row. */}
        <div className="grid gap-1">
          <p className="font-medium">{mark.label}</p>
          <p>{mark.explanation}</p>
        </div>
      </TooltipContent>
    </Tooltip>
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
  const shown = useRetained(entry)
  const json = shown === undefined ? "" : JSON.stringify(shown.schema, null, 2)

  return (
    <Dialog onOpenChange={onOpenChange} open={entry !== undefined}>
      <DialogContent
        // Full-bleed: the copy-row divider spans the card, the pre scrolls.
        bodyClassName="gap-0 p-0"
        className="bg-muted sm:max-w-3xl"
        // Autofocusing the copy button pops its tooltip, whose layer then
        // swallows Escape before the dialog can see it.
        onOpenAutoFocus={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogDescription className="sr-only">
          The JSON Schema every write to this state entry is validated against.
        </DialogDescription>
        <div className="grid min-w-0 overflow-hidden">
          <div className="flex min-w-0 items-center justify-between gap-2 border-b px-3 py-2">
            <DialogTitle className="min-w-0 truncate font-medium font-mono text-foreground text-xs">
              {shown?.schemaName}{" "}
              <span className="font-normal text-[0.625rem] text-muted-foreground">
                v{shown?.schemaVersion}
              </span>
            </DialogTitle>
            <CopyButton label="schema" value={json} />
          </div>
          <pre
            className={`max-h-[70vh] min-w-0 overflow-auto px-3 py-2 font-mono text-foreground text-xs leading-relaxed ${codeTokenClassName}`}
          >
            <code className="block whitespace-pre-wrap break-words">
              {shown === undefined ? null : <JsonView value={shown.schema} />}
            </code>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
