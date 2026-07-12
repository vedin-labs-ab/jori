import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"

const contextLayers = [
  {
    label: "Requester",
    items: [
      "Name",
      "Email addresses",
      "Timezone",
      "Accessible account identities",
    ],
  },
  {
    label: "Organization",
    items: ["Approved profile", "Websites", "Workstreams"],
  },
  {
    label: "Run",
    items: [
      "Run and automation IDs",
      "Current time",
      "Trigger details",
      "Event details",
      "Attached artifact",
    ],
  },
] as const

export function AutomationContextSection() {
  return (
    <div className="grid gap-2">
      <Label htmlFor="automation-context">Context</Label>
      <Collapsible className="overflow-hidden rounded-md border">
        <CollapsibleTrigger asChild>
          <button
            className="group flex min-h-8 w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs/relaxed transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
            id="automation-context"
            type="button"
          >
            <span>Requester, organization, and run details</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-3 border-t px-3 py-3 sm:grid-cols-3">
            {contextLayers.map((layer) => (
              <ContextLayer key={layer.label} {...layer} />
            ))}
          </div>
          <p className="border-t bg-muted/30 px-3.5 py-1.5 text-muted-foreground text-[0.6875rem]/relaxed">
            Available context is resolved fresh for every run.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
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
