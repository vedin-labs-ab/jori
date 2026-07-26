import {
  type ToolSurface,
  toolSurfaceLabel,
  toolSurfaces,
} from "@contracts/integrations"
import { relativeTime } from "../shared/time"
import { type ToolCapability } from "../shared/tools/model"
import { type ContractEntrySummary } from "./contract"
import { type AppSummary } from "./types"

export type CapabilityGroup = {
  type: ToolSurface
  label: string
  tools: ToolCapability[]
}

const toolSurfaceSet = new Set<string>(toolSurfaces)

export function capabilityGroupsFor(app: AppSummary) {
  const groups = new Map<string, CapabilityGroup>()

  for (const capability of app.capabilities) {
    const surface = normalizeSurface(capability.surface)
    const label = toolSurfaceLabel(surface)
    const key = surface
    const group = groups.get(key)
    const tool = {
      access: capability.access,
      description: capability.description,
      label: capability.label,
      tool: capability.tool,
    }

    if (group === undefined) {
      groups.set(key, { type: surface, label, tools: [tool] })
      continue
    }

    group.tools.push(tool)
  }

  return [...groups.values()].sort(compareCapabilityGroups)
}

export function automationSummary(
  automation: AppSummary["automations"][number],
  now: number
) {
  if (automation.status !== undefined && automation.status !== "active") {
    return statusLabel(automation.status)
  }

  if (automation.nextAt !== undefined && automation.nextAt > now) {
    return `Next ${relativeTime(automation.nextAt, now)}`
  }

  if (automation.firedAt !== undefined) {
    return `Ran ${relativeTime(automation.firedAt, now)}`
  }

  if (automation.status === "active") {
    return "Monitoring"
  }

  return "Linked"
}

function normalizeSurface(value: string | undefined) {
  return toolSurfaceSet.has(value ?? "") ? (value as ToolSurface) : "jori"
}

function compareCapabilityGroups(
  left: CapabilityGroup,
  right: CapabilityGroup
) {
  if (left.type === "jori") {
    return -1
  }

  if (right.type === "jori") {
    return 1
  }

  return left.label.localeCompare(right.label)
}

function statusLabel(
  status: NonNullable<AppSummary["automations"][number]["status"]>
) {
  return status[0].toUpperCase() + status.slice(1)
}

/** Console rows for a stored app contract, as the queries return it. */
export function stateContractEntries(
  entries:
    | readonly {
        name: string
        scope: string
        description?: string
        schemaName: string
        schemaVersion: number
        schema: unknown
      }[]
    | undefined
): ContractEntrySummary[] {
  return (entries ?? []).map((entry) => ({
    name: entry.name,
    scope: entry.scope,
    description: entry.description,
    schemaName: entry.schemaName,
    schemaVersion: entry.schemaVersion,
    schema: entry.schema,
  }))
}
