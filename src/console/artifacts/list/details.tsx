import {
  Activity,
  Database,
  History,
  LayoutTemplate,
  Text,
  UserRound,
  Workflow,
  Wrench,
} from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { countLabel } from "@/lib/count"
import { DetailRow } from "../../shared/details"
import { SeparatorDot } from "../../shared/dot"
import { absoluteTime, relativeTime } from "../../shared/time"
import { ToolGroupsValue } from "../../shared/tools"
import {
  automationSummary,
  type CapabilityGroup,
  currentVersionMessage,
  stateScopeLabel,
} from "../format"
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
      <SummaryRow artifact={artifact} />
      <TemplateRow artifact={artifact} />
      <ContractRow artifact={artifact} />
      <DetailRow icon={Wrench} label="Tools">
        <ArtifactToolsValue groups={capabilityGroups} />
      </DetailRow>
      <DetailRow icon={Workflow} label="Automations">
        <AutomationChips automations={artifact.automations} now={now} />
      </DetailRow>
      <DetailRow icon={UserRound} label="Owner">
        <FactLine>
          <span className="font-medium text-foreground">
            {artifact.ownerName ?? "Unknown"}
          </span>
        </FactLine>
      </DetailRow>
      <DetailRow icon={History} label="Versions">
        <VersionsFact artifact={artifact} now={now} />
      </DetailRow>
      <DetailRow icon={Activity} label="Activity">
        <FactLine>
          <TimeFact at={artifact.createdAt} now={now} prefix="Created" />
          <SeparatorDot className="text-muted-foreground/60" />
          <LastOpenedFact lastOpenedAt={artifact.lastOpenedAt} now={now} />
        </FactLine>
      </DetailRow>
    </div>
  )
}

/** Template provenance: which template produced this artifact, and whether
 *  the user has customized it since. */
function TemplateRow({ artifact }: { artifact: ArtifactSummary }) {
  const template = artifact.template

  if (template == null) {
    return null
  }

  return (
    <DetailRow icon={LayoutTemplate} label="Template">
      <FactLine>
        <span className="font-medium text-foreground">
          {template.key} · v{template.version}
        </span>
        {template.customized ? (
          <>
            <SeparatorDot className="text-muted-foreground/60" />
            <span>Customized — template updates leave it untouched</span>
          </>
        ) : null}
      </FactLine>
    </DetailRow>
  )
}

/** The state contract: named entries the artifact and its automations
 *  read and write, validated server-side against their schemas. */
function ContractRow({ artifact }: { artifact: ArtifactSummary }) {
  const entries = artifact.contract?.state ?? []

  if (entries.length === 0) {
    return null
  }

  return (
    <DetailRow icon={Database} label="State">
      <div className="grid min-w-0 gap-1 text-muted-foreground text-xs">
        {entries.map((entry) => (
          <FactLine key={entry.name}>
            <span className="font-medium text-foreground">{entry.name}</span>
            <span>
              {stateScopeLabel(entry.scope)} · {entry.schemaName} v
              {entry.schemaVersion}
            </span>
            {entry.description === undefined ? null : (
              <>
                <SeparatorDot className="text-muted-foreground/60" />
                <span className="min-w-0 truncate" title={entry.description}>
                  {entry.description}
                </span>
              </>
            )}
          </FactLine>
        ))}
      </div>
    </DetailRow>
  )
}

function SummaryRow({ artifact }: { artifact: ArtifactSummary }) {
  const message = currentVersionMessage(artifact)

  if (message === undefined) {
    return null
  }

  return (
    <DetailRow icon={Text} label="Summary">
      <p className="min-w-0 text-foreground text-xs">{message}</p>
    </DetailRow>
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
        {countLabel(artifact.versions.length, "version")}
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
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
      {children}
    </div>
  )
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
  return <div className="min-w-0 text-muted-foreground text-xs">{children}</div>
}
