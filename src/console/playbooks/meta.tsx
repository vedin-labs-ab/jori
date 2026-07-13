import { type Integration, integrationLabels } from "@contracts/integrations"
import { playbookSlotIntentLabels } from "@contracts/playbooks/capabilities"
import {
  describePlaybookCadence,
  type PlaybookDefinition,
} from "@contracts/playbooks/catalog"
import { type PlaybookOptionValues } from "@contracts/playbooks/options"
import { CalendarClock, Globe } from "lucide-react"
import { type ReactNode } from "react"
import { SurfaceLogo } from "../automations/access/logo"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
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
      <PlaybookSchedule definition={definition} row={row} />
      <PlaybookAccess definition={definition} row={row} />
    </div>
  )
}

export function PlaybookSchedule({
  definition,
  options,
  row,
}: {
  definition: PlaybookDefinition
  options?: PlaybookOptionValues
  row: PlaybookListRow | undefined
}) {
  return (
    <PlaybookSection label="Schedule">
      <div className="flex items-start gap-1.5">
        <CalendarClock className="mt-px size-3.5 shrink-0 text-muted-foreground" />
        <span>{describePlaybookCadence(definition, options)}</span>
        <NextRun enabled={row?.enabled} />
      </div>
    </PlaybookSection>
  )
}

export function PlaybookAccess({
  choices,
  definition,
  row,
}: {
  choices?: Record<string, Integration>
  definition: PlaybookDefinition
  row: PlaybookListRow | undefined
}) {
  return (
    <PlaybookSection label="Access">
      {definition.slots.map((slot) => (
        <div className="flex items-center gap-1.5" key={slot.capability}>
          <span className="flex shrink-0 items-center gap-1">
            {displayProviders(slot, row, choices).map((provider) => (
              <SurfaceLogo
                key={provider.integration}
                alt={providerAlt(provider)}
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
          <Globe className="size-3.5 shrink-0 text-muted-foreground" />
          <span>Web research</span>
        </div>
      ) : null}
    </PlaybookSection>
  )
}

function displayProviders(
  slot: PlaybookDefinition["slots"][number],
  row: PlaybookListRow | undefined,
  choices: Record<string, Integration> | undefined
) {
  const choice = choices?.[slot.capability]

  return choice === undefined
    ? slotDisplayProviders(slot, row)
    : [{ integration: choice, connected: true }]
}

/** Live "Next in 14h" suffix once the playbook is enabled and active. */
function NextRun({
  enabled,
}: {
  enabled: PlaybookListRow["enabled"] | undefined
}) {
  const now = useNow(60_000)

  if (enabled?.status !== "active" || enabled.nextRunAt === undefined) {
    return null
  }

  return (
    <span
      className="truncate text-muted-foreground"
      title={absoluteTime(enabled.nextRunAt)}
    >
      · Next {relativeTime(enabled.nextRunAt, now)}
    </span>
  )
}

function providerAlt(provider: {
  connected: boolean
  integration: Integration
}) {
  const label = integrationLabels[provider.integration]

  return provider.connected ? label : `${label} (not connected)`
}

export function PlaybookSection({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="grid gap-1.5 text-xs">
      <p className="font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}
