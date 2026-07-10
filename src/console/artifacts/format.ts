import {
  type ToolSurface,
  toolSurfaceLabel,
  toolSurfaces,
} from "@contracts/integrations"
import { type ExecutionDetailTool } from "../runs/types"
import { relativeTime } from "../shared/time"
import { type ArtifactSummary } from "./types"

export type CapabilityGroup = {
  type: ToolSurface
  label: string
  tools: ExecutionDetailTool[]
}

const toolSurfaceSet = new Set<string>(toolSurfaces)

export function capabilityGroupsFor(artifact: ArtifactSummary) {
  const groups = new Map<string, CapabilityGroup>()

  for (const capability of artifact.capabilities) {
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

export function toolSurfaceList(groups: CapabilityGroup[]) {
  return groups.map((group) => group.type)
}

export function automationCountLabel(count: number) {
  return count === 1 ? "1 automation" : `${count} automations`
}

export function currentVersionMessage(artifact: ArtifactSummary) {
  return artifact.versions.find((version) => version.isCurrent)?.message
}

export function automationSummary(
  automation: ArtifactSummary["automations"][number],
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
  return toolSurfaceSet.has(value ?? "") ? (value as ToolSurface) : "milo"
}

function compareCapabilityGroups(
  left: CapabilityGroup,
  right: CapabilityGroup
) {
  if (left.type === "milo") {
    return -1
  }

  if (right.type === "milo") {
    return 1
  }

  return left.label.localeCompare(right.label)
}

function statusLabel(
  status: NonNullable<ArtifactSummary["automations"][number]["status"]>
) {
  return status[0].toUpperCase() + status.slice(1)
}
