import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

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

export function AutomationContextSection() {
  return (
    <Collapsible className="grid gap-2">
      <CollapsibleTrigger asChild>
        <button
          className="group flex min-h-5 w-full items-center justify-between gap-3 rounded-sm text-left font-medium text-xs/relaxed leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          type="button"
        >
          <span>Context</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden rounded-md border">
        <div className="grid gap-3 px-3 py-3 sm:grid-cols-3">
          {contextLayers.map((layer) => (
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
