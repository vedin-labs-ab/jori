import { playbookCatalog } from "@contracts/playbooks/catalog"
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
import { ContractEntryList, TitleVersion } from "../contract"
import {
  automationSummary,
  type CapabilityGroup,
  stateContractEntries,
} from "../format"
import { type AppSummary } from "../types"

export function AppExpanded({
  app,
  capabilityGroups,
  now,
}: {
  app: AppSummary
  capabilityGroups: CapabilityGroup[]
  now: number
}) {
  return (
    <div>
      <SummaryRow app={app} />
      <TemplateRow app={app} />
      <ContractRow app={app} />
      <DetailRow icon={Wrench} label="Tools">
        <AppToolsValue groups={capabilityGroups} />
      </DetailRow>
      <DetailRow icon={Workflow} label="Automations">
        <AutomationChips automations={app.automations} now={now} />
      </DetailRow>
      <DetailRow icon={UserRound} label="Owner">
        <FactLine>
          <span className="font-medium text-foreground">
            {app.ownerName ?? "Unknown"}
          </span>
        </FactLine>
      </DetailRow>
      <DetailRow icon={History} label="Versions">
        <VersionsFact app={app} now={now} />
      </DetailRow>
      <DetailRow icon={Activity} label="Activity">
        <FactLine>
          <TimeFact at={app.createdAt} now={now} prefix="Created" />
          <SeparatorDot className="text-muted-foreground/60" />
          <LastOpenedFact lastOpenedAt={app.lastOpenedAt} now={now} />
        </FactLine>
      </DetailRow>
    </div>
  )
}

/** Template provenance in the builder card's grammar: resolved title with
 *  the vN suffix, then whether the user has customized it since — or that
 *  the playbook now ships a newer template. */
function TemplateRow({ app }: { app: AppSummary }) {
  const template = app.template

  if (template == null) {
    return null
  }

  const definition = playbookCatalog.find(
    (candidate) => candidate.key === template.key
  )
  const note = template.customized
    ? "Customized: template updates leave it untouched"
    : definition !== undefined && template.version < definition.version
      ? `v${definition.version} available: update from the playbook card`
      : undefined

  return (
    <DetailRow icon={LayoutTemplate} label="Template">
      <FactLine>
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 truncate font-medium text-foreground">
            {definition?.app?.title ?? template.key}
          </span>
          <TitleVersion version={template.version} />
        </span>
        {note === undefined ? null : (
          <>
            <SeparatorDot className="text-muted-foreground/60" />
            <span>{note}</span>
          </>
        )}
      </FactLine>
    </DetailRow>
  )
}

/** The state contract: named entries the app and its automations
 *  read and write, validated server-side against their schemas — each
 *  entry opens its schema, exactly as in the automation builder. */
function ContractRow({ app }: { app: AppSummary }) {
  const entries = stateContractEntries(app.contract?.state)

  if (entries.length === 0) {
    return null
  }

  return (
    <DetailRow icon={Database} label="State">
      <ContractEntryList entries={entries} />
    </DetailRow>
  )
}

function SummaryRow({ app }: { app: AppSummary }) {
  const message = app.versions.find((version) => version.isCurrent)?.message

  if (message === undefined) {
    return null
  }

  return (
    <DetailRow icon={Text} label="Summary">
      <p className="min-w-0 text-foreground text-xs">{message}</p>
    </DetailRow>
  )
}

function VersionsFact({ app, now }: { app: AppSummary; now: number }) {
  const currentVersion = app.versions.find((version) => version.isCurrent)

  if (currentVersion === undefined) {
    return <EmptyDetailValue>Not published yet</EmptyDetailValue>
  }

  return (
    <FactLine>
      <span className="font-medium text-foreground">
        {countLabel(app.versions.length, "version")}
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

function AppToolsValue({ groups }: { groups: CapabilityGroup[] }) {
  if (groups.length === 0) {
    return <EmptyDetailValue>No app tools</EmptyDetailValue>
  }

  return (
    <ToolGroupsValue description="Tools granted to this app." groups={groups} />
  )
}

function AutomationChips({
  automations,
  now,
}: {
  automations: AppSummary["automations"]
  now: number
}) {
  if (automations.length === 0) {
    return <EmptyDetailValue>No app automations</EmptyDetailValue>
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
