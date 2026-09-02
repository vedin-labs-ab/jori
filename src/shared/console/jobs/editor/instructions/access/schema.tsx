import { Braces } from "lucide-react"
import { useContext, useState } from "react"
import { Button } from "@/components/ui/button"
import { DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { JsonDialog } from "@/shared/console/code"
import { useRetained } from "@/shared/console/retain"
import { type ToolPermission } from "@/shared/console/tools/model"
import {
  ToolReferenceContext,
  type ToolReferenceLoaderProps,
  type ToolReferences,
  toolReferenceReady,
} from "./wire"

const directions = [
  { key: "request", label: "Request" },
  { key: "response", label: "Response" },
] as const

type SchemaDirection = (typeof directions)[number]["key"]

/** Bridges the host's reference loader to views that cannot host a
 *  subscription unconditionally: mount on the first sign of intent, results
 *  flow up through onChange. Without a host, nothing loads. */
export function ToolReferencesLoader(props: ToolReferenceLoaderProps) {
  const Loader = useContext(ToolReferenceContext)

  return Loader === undefined ? null : <Loader {...props} />
}

/** Row action revealed on hover: opens the tool's wire schemas. Pending
 *  mirrors the Advanced settings idiom, a spinner in the icon slot and a
 *  disabled trigger, for the rare click that beats the data. Without a
 *  host to serve schemas there is nothing to open, so nothing is offered. */
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
  const hasHost = useContext(ToolReferenceContext) !== undefined

  if (!hasHost) {
    return null
  }

  return (
    <Button
      aria-label={`View the ${toolLabel} schema`}
      className="opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover/tool-row:opacity-100 [@media(pointer:coarse)]:opacity-100"
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
        <ToggleGroup
          aria-label="Schema direction"
          className="flex min-w-0 items-center gap-0.5"
          onValueChange={(nextDirection) => {
            if (shown !== undefined && nextDirection !== "") {
              setSelected({
                direction: nextDirection as SchemaDirection,
                tool: shown.tool,
              })
            }
          }}
          type="single"
          value={direction}
        >
          <DialogTitle className="sr-only">{shown?.label} schema</DialogTitle>
          {directions.map((option) => (
            <ToggleGroupItem
              className="h-auto min-w-0 rounded-sm px-2 py-0.5 font-mono text-xs shadow-none active:translate-y-0 data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
              key={option.key}
              value={option.key}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
      onOpenChange={onOpenChange}
      open={toolReferenceReady(references, permission?.tool)}
      value={reference?.[direction]}
    />
  )
}
