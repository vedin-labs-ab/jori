import { Activity, History, UserRound, Workflow, Wrench } from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { DetailRow } from "../../shared/details"
import { SeparatorDot } from "../../shared/dot"
import { absoluteTime, relativeTime } from "../../shared/time"
import { ToolGroupsValue } from "../../shared/tools"
import { automationSummary, type CapabilityGroup } from "../format"
import { type ArtifactSummary } from "../types"

export function ArtifactExpanded({
  artifact,
  capabilityGroups,
  now,
}: {
  artifact: ArtifactSummary
  capabilityGroups: CapabilityGroup[]
  now: number
}) {
  return (
    <div>
      <DetailRow
        icon={Wrench}
        iconClassName="text-muted-foreground"
        label="Tools"
      >
        <ArtifactToolsValue groups={capabilityGroups} />
      </DetailRow>
      <DetailRow
        icon={Workflow}
        iconClassName="text-muted-foreground"
        label="Automations"
      >
        <AutomationChips automations={artifact.automations} now={now} />
      </DetailRow>
      <DetailRow
        icon={UserRound}
        iconClassName="text-muted-foreground"
        label="Owner"
      >
        <FactLine>
          <span className="font-medium text-foreground">
            {artifact.ownerName ?? "Unknown"}
          </span>
        </FactLine>
      </DetailRow>
      <DetailRow
        icon={History}
        iconClassName="text-muted-foreground"
        label="Versions"
      >
        <VersionsFact artifact={artifact} now={now} />
      </DetailRow>
      <DetailRow
        icon={Activity}
        iconClassName="text-muted-foreground"
        label="Activity"
      >
        <FactLine>
          <TimeFact at={artifact.createdAt} now={now} prefix="Created" />
          <SeparatorDot className="text-muted-foreground/60" />
          <LastOpenedFact lastOpenedAt={artifact.lastOpenedAt} now={now} />
        </FactLine>
      </DetailRow>
    </div>
  )
}

function VersionsFact({
  artifact,
  now,
}: {
  artifact: ArtifactSummary
  now: number
}) {
  const currentVersion = artifact.versions.find((version) => version.isCurrent)

  if (currentVersion === undefined) {
    return <EmptyDetailValue>Not published yet</EmptyDetailValue>
  }

  return (
    <FactLine>
      <span className="font-medium text-foreground">
        {versionCountLabel(artifact.versions.length)}
      </span>
      <SeparatorDot className="text-muted-foreground/60" />
      <TimeFact at={currentVersion.createdAt} now={now} prefix="Published" />
    </FactLine>
  )
}

function LastOpenedFact({
  lastOpenedAt,
  now,
}: {
  lastOpenedAt: number | undefined
  now: number
}) {
  if (lastOpenedAt === undefined) {
    return <span>Never opened</span>
  }

  return <TimeFact at={lastOpenedAt} now={now} prefix="Opened" />
}

function TimeFact({
  at,
  now,
  prefix,
}: {
  at: number
  now: number
  prefix: string
}) {
  return (
    <span title={absoluteTime(at)}>
      {prefix} {relativeTime(at, now)}
    </span>
  )
}

function FactLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-1.5 text-muted-foreground text-xs">
      {children}
    </div>
  )
}

function versionCountLabel(count: number) {
  return count === 1 ? "1 version" : `${count} versions`
}

function ArtifactToolsValue({ groups }: { groups: CapabilityGroup[] }) {
  if (groups.length === 0) {
    return <EmptyDetailValue>No artifact tools</EmptyDetailValue>
  }

  return (
    <ToolGroupsValue
      description="Tools granted to this artifact."
      groups={groups}
    />
  )
}

function AutomationChips({
  automations,
  now,
}: {
  automations: ArtifactSummary["automations"]
  now: number
}) {
  if (automations.length === 0) {
    return <EmptyDetailValue>No artifact automations</EmptyDetailValue>
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {automations.map((automation) => (
        <Badge
          className="h-7 gap-2 rounded-md px-2.5 font-normal"
          key={automation.automationId}
          variant="outline"
        >
          <span className="font-medium text-foreground">
            {automation.name ?? "Automation"}
          </span>
          <span className="text-muted-foreground">
            {automationSummary(automation, now)}
          </span>
        </Badge>
      ))}
    </div>
  )
}

function EmptyDetailValue({ children }: { children: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted px-2.5 py-2 text-muted-foreground text-xs">
      {children}
    </div>
  )
}
