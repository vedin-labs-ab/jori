import { Braces } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { type ToolPermission } from "../../../../permissions/types"
import { JsonDialog } from "../../../../shared/code"
import { useRetained } from "../../../../shared/retain"
import {
  type ToolReferences,
  toolReferenceReady,
  useToolReferences,
} from "./wire"

const directions = [
  { key: "request", label: "Request" },
  { key: "response", label: "Response" },
] as const

type SchemaDirection = (typeof directions)[number]["key"]

/** Bridges the reference subscription to views that cannot host the query
 *  hook unconditionally: mount on the first sign of intent, results flow up
 *  through onChange. */
export function ToolReferencesLoader({
  onChange,
  tenantId,
  tools,
}: {
  onChange: (references: ToolReferences) => void
  tenantId: string
  tools: string[]
}) {
  const references = useToolReferences(tenantId, tools, true)

  useEffect(() => {
    if (references !== undefined) {
      onChange(references)
    }
  }, [onChange, references])

  return null
}

/** Row action revealed on hover: opens the tool's wire schemas. Pending
 *  mirrors the Advanced settings idiom — spinner in the icon slot and a
 *  disabled trigger — for the rare click that beats the data. */
export function ToolSchemaButton({
  onClick,
  onWarm,
  pending,
  toolLabel,
}: {
  onClick: () => void
  /** First sign of pointer or focus intent; lets callers warm data early. */
  onWarm: () => void
  pending: boolean
  toolLabel: string
}) {
  return (
    <Button
      aria-label={`View the ${toolLabel} schema`}
      className="opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/tool-row:opacity-100"
      disabled={pending}
      onClick={onClick}
      onFocus={onWarm}
      onPointerOver={onWarm}
      size="sm"
      type="button"
      variant="secondary"
    >
      {pending ? <Spinner /> : <Braces aria-hidden="true" />}
      Schema
    </Button>
  )
}

/** The terminal-style schema dialog with a Request/Response switch where
 *  the title normally sits. It opens only once the schemas are resolved,
 *  so it never paints empty and sizes to its content exactly once. */
export function ToolSchemaDialog({
  onOpenChange,
  permission,
  references,
}: {
  onOpenChange: (open: boolean) => void
  permission: ToolPermission | undefined
  references: ToolReferences | undefined
}) {
  const shown = useRetained(permission)
  // Direction is remembered per tool; a fresh dialog opens on Response —
  // what a tool returns is usually the question being asked.
  const [selected, setSelected] = useState<{
    direction: SchemaDirection
    tool: string
  }>()
  const direction =
    selected !== undefined && selected.tool === shown?.tool
      ? selected.direction
      : "response"
  const reference = shown === undefined ? undefined : references?.[shown.tool]

  return (
    <JsonDialog
      description="The request schema this tool accepts and the response it returns."
      headerLeft={
        <div
          aria-label="Schema direction"
          className="flex min-w-0 items-center gap-0.5"
          role="tablist"
        >
          <DialogTitle className="sr-only">{shown?.label} schema</DialogTitle>
          {directions.map((option) => (
            <button
              aria-selected={direction === option.key}
              className={cn(
                "rounded-sm px-2 py-0.5 font-medium font-mono text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30",
                direction === option.key
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={option.key}
              onClick={() =>
                shown === undefined
                  ? undefined
                  : setSelected({ direction: option.key, tool: shown.tool })
              }
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      }
      onOpenChange={onOpenChange}
      open={toolReferenceReady(references, permission?.tool)}
      value={reference?.[direction]}
    />
  )
}
