import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { flushRowClassName } from "../../../shared/flush"

const contextLayers = [
  {
    label: "Requester",
    items: ["Name", "Email addresses", "Timezone", "Account identities"],
  },
  {
    label: "Organization",
    items: ["Profile", "Websites", "Workstreams"],
  },
  {
    label: "Run",
    items: [
      "Run identifiers",
      "Automation identifiers",
      "Current time",
      "Trigger details",
      "Event details",
      "Associated artifact",
    ],
  },
] as const

export function AutomationContextSection({
  scope,
}: {
  scope: "personal" | "organization"
}) {
  const visibleLayers =
    scope === "personal"
      ? contextLayers
      : contextLayers.filter((layer) => layer.label !== "Requester")

  return (
    <Collapsible className="grid gap-2">
      <CollapsibleTrigger asChild>
        <button
          className={flushRowClassName(
            "group min-h-5 justify-between gap-3 rounded-sm text-left text-xs/relaxed leading-none [&[aria-expanded=true]:not(:hover)]:bg-transparent"
          )}
          type="button"
        >
          <span>Context</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden rounded-md border">
        <div
          className={cn(
            "grid gap-3 px-3 py-3",
            visibleLayers.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
          )}
        >
          {visibleLayers.map((layer) => (
            <ContextLayer key={layer.label} {...layer} />
          ))}
        </div>
        <p className="border-t bg-muted/30 px-3.5 py-1.5 text-muted-foreground text-[0.6875rem]/relaxed">
          Context is resolved for each run.
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ContextLayer({
  items,
  label,
}: {
  items: readonly string[]
  label: string
}) {
  return (
    <section className="grid content-start gap-1.5">
      <h3 className="font-medium text-xs/relaxed">{label}</h3>
      <ul className="grid list-disc gap-0.5 pl-3.5 text-muted-foreground text-xs/relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
