import { playbookSlotIntentLabels } from "@contracts/playbooks/capabilities"
import { type PlaybookDefinition } from "@contracts/playbooks/catalog"
import { describePlaybookSchedule } from "@contracts/playbooks/schedule"
import { Globe, Repeat2 } from "lucide-react"
import { type ReactNode } from "react"
import { SurfaceLogo } from "../automations/access/logo"
import { type PlaybookListRow, slotDisplayProviders } from "./state"

export function PlaybookMeta({
  definition,
  row,
}: {
  definition: PlaybookDefinition
  row: PlaybookListRow | undefined
}) {
  return (
    <div className="grid gap-3">
      <PlaybookMetaSection label="Trigger">
        <div className="flex items-center gap-1.5">
          <Repeat2 className="size-3.5 shrink-0" />
          <span>{describePlaybookSchedule(definition.schedule)}</span>
        </div>
      </PlaybookMetaSection>
      <PlaybookMetaSection label="Tools">
        {definition.slots.map((slot) => (
          <div className="flex items-center gap-1.5" key={slot.capability}>
            <span className="flex shrink-0 items-center gap-1">
              {slotDisplayProviders(slot, row).map((provider) => (
                <SurfaceLogo
                  key={provider.integration}
                  className={provider.connected ? undefined : "opacity-40"}
                  integration={provider.integration}
                />
              ))}
            </span>
            <span className="truncate">
              {playbookSlotIntentLabels(slot).join(" · ")}
            </span>
          </div>
        ))}
        {definition.web ? (
          <div className="flex items-center gap-1.5">
            <Globe className="size-3.5 shrink-0" />
            <span>Web research</span>
          </div>
        ) : null}
      </PlaybookMetaSection>
    </div>
  )
}

function PlaybookMetaSection({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="grid gap-1.5 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">{label}</p>
      {children}
    </div>
  )
}
