import { useQuery } from "convex/react"
import { Braces } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { api } from "../../../../../../convex/_generated/api"
import { type ToolPermission } from "../../../../permissions/types"
import { JsonDialog } from "../../../../shared/code"
import { useRetained } from "../../../../shared/retain"

const directions = [
  { key: "request", label: "Request" },
  { key: "response", label: "Response" },
] as const

type SchemaDirection = (typeof directions)[number]["key"]

/** Row action revealed on hover: opens the tool's wire schemas. */
export function ToolSchemaButton({
  onClick,
  toolLabel,
}: {
  onClick: () => void
  toolLabel: string
}) {
  return (
    <Button
      aria-label={`View the ${toolLabel} schema`}
      className="opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/tool-row:opacity-100"
      onClick={onClick}
      size="sm"
      type="button"
      variant="secondary"
    >
      <Braces aria-hidden="true" />
      Schema
    </Button>
  )
}

/** The terminal-style schema dialog with a Request/Response switch where
 *  the title normally sits. */
export function ToolSchemaDialog({
  onOpenChange,
  permission,
  tenantId,
}: {
  onOpenChange: (open: boolean) => void
  permission: ToolPermission | undefined
  tenantId: string
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
  const reference = useQuery(
    api.permissions.reference.get,
    shown === undefined ? "skip" : { tenantId, tool: shown.tool }
  )

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
      open={permission !== undefined}
      value={reference?.[direction]}
    />
  )
}
