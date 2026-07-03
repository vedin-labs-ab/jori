import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"

export type OrganizationProfile = FunctionReturnType<
  typeof api.organization.profile.get
>

export type OrganizationDiscovery = FunctionReturnType<
  typeof api.organization.discovery.get
>

export type OrganizationSources = FunctionReturnType<
  typeof api.organization.sources.list
>

export type ContextSource = NonNullable<OrganizationSources>[number]

type DiscoveryRun = NonNullable<OrganizationDiscovery>
export type DiscoveryStep = DiscoveryRun["steps"][number]

export type DiscoveryItemStatus = "active" | "completed" | "failed" | "queued"
export type DiscoveryTaskStatus = DiscoveryItemStatus | "warning"

export type DiscoveryTaskItem = {
  endedAt?: number
  key: string
  label: string
  startedAt: number
  status: DiscoveryItemStatus
  url: string
}

export type DiscoveryTask = {
  elapsedMs: number
  endedAt?: number
  items: DiscoveryTaskItem[]
  key: string
  label: string
  startedAt: number
  status: DiscoveryTaskStatus
  type: "exploration" | "summary"
}

export type ContextFacts = Pick<
  NonNullable<OrganizationProfile>,
  "name" | "aliases" | "domains" | "summary"
>

export type ContextProposal = NonNullable<
  NonNullable<OrganizationProfile>["proposed"]
>

export function hasFacts(facts: ContextFacts) {
  if (isFactPresent(facts.name) || isFactPresent(facts.summary)) {
    return true
  }

  return facts.aliases.length + facts.domains.length > 0
}

export function isFactPresent(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== ""
}
