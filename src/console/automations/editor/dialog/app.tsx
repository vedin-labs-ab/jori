import {
  type PlaybookDefinition,
  playbookCatalog,
} from "@contracts/playbooks/catalog"
import { playbookTemplateContracts } from "@contracts/playbooks/generated"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { AppWindow, ArrowUpRight } from "lucide-react"
import { type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../../convex/_generated/api"
import {
  ContractEntries,
  type ContractEntrySummary,
  TitleVersion,
} from "../../../apps/contract"
import { stateContractEntries } from "../../../apps/format"
import { absoluteTime, relativeTime } from "../../../shared/time"
import { FieldHelp } from "../../help"
import { type AutomationFormValues } from "../../types"

type AppResult = FunctionReturnType<typeof api.apps.console.get>
type AppDetail = Extract<AppResult, { status: "ready" }>["app"] & {}

/**
 * The automation's primary app: the default target for app state
 * tools and the resource its lifecycle is coupled to. Absent for plain
 * automations; prospective for playbook drafts that provision on create.
 */
export function AutomationAppSection({
  organizationId,
  values,
}: {
  organizationId: string
  values: AutomationFormValues
}) {
  const definition = playbookCatalog.find(
    (candidate) => candidate.key === values.playbook?.key
  )

  if (values.appId === undefined && definition?.app === undefined) {
    return null
  }

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex items-center gap-1.5">
        <Label>App</Label>
        <FieldHelp label="App help">
          <p>
            The app this automation works in — state is read and written here by
            default.
          </p>
          <p>Instructions can still reference other apps by ID.</p>
        </FieldHelp>
      </div>
      {values.appId === undefined ? (
        <ProspectiveApp definition={definition} values={values} />
      ) : (
        <LiveApp
          appId={values.appId}
          definition={definition}
          organizationId={organizationId}
        />
      )}
    </div>
  )
}

/** A playbook draft: nothing exists yet — creation provisions the app. */
function ProspectiveApp({
  definition,
  values,
}: {
  definition: PlaybookDefinition | undefined
  values: AutomationFormValues
}) {
  const app = definition?.app
  const binding = values.playbook

  if (app === undefined || binding === undefined) {
    return null
  }

  return (
    <AppCard
      entries={templateContractEntries(binding.key)}
      footer="Set up from its template when you create this automation."
      lines={<p className="text-muted-foreground">{app.description}</p>}
      title={
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 truncate font-medium text-foreground text-sm">
            {app.title}
          </span>
          <TitleVersion version={binding.version} />
        </span>
      }
    />
  )
}

function LiveApp({
  appId,
  definition,
  organizationId,
}: {
  appId: NonNullable<AutomationFormValues["appId"]>
  definition: PlaybookDefinition | undefined
  organizationId: string
}) {
  const result = useQuery(api.apps.console.get, {
    organizationId,
    appId,
  })

  if (result === undefined) {
    return <Skeleton className="h-16 w-full" />
  }

  if (result.status !== "ready" || result.app === null) {
    return (
      <AppCard
        entries={[]}
        lines={null}
        title={
          <span className="min-w-0 truncate text-muted-foreground">
            App unavailable — it may have been deleted.
          </span>
        }
      />
    )
  }

  const app = result.app

  return (
    <AppCard
      entries={stateContractEntries(app.contract?.state)}
      lines={
        <>
          {definition?.app === undefined ? null : (
            <p className="text-muted-foreground">
              {definition.app.description}
            </p>
          )}
          {provenanceLine(app, definition)}
        </>
      }
      title={
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate font-medium text-foreground text-sm">
              {app.title}
            </span>
            <TitleVersion version={app.template?.version} />
          </span>
          <Link
            className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
            params={{ appId: app.appId }}
            to="/apps/$appId"
          >
            Open <ArrowUpRight className="size-3" />
          </Link>
        </span>
      }
    />
  )
}

/** One quiet card telling the app's story: identity first, then its
 *  state entries under a State label, with an optional process hint as a
 *  full-bleed footer strip — the Context card's grammar exactly. */
function AppCard({
  entries,
  footer,
  lines,
  title,
}: {
  entries: ContractEntrySummary[]
  footer?: string
  lines: ReactNode
  title: ReactNode
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border text-xs">
      <div className="grid min-w-0 gap-2.5 px-2 py-2">
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <AppWindow className="size-4 shrink-0 text-muted-foreground" />
            {title}
          </div>
          {lines}
        </div>
        <ContractEntries entries={entries} />
      </div>
      {footer === undefined ? null : (
        <p className="flex min-h-9 items-center border-t bg-muted/30 px-2 text-muted-foreground text-xs/relaxed">
          {footer}
        </p>
      )}
    </div>
  )
}

/** Template provenance with one quiet suffix: customized wins, then an
 *  available update (applied from the playbook card), then recency. */
function provenanceLine(
  app: AppDetail,
  definition: PlaybookDefinition | undefined
) {
  const template = app.template

  if (template == null) {
    return null
  }

  const publishedAt = app.versions.find(
    (version) => version.isCurrent
  )?.createdAt
  const suffix = template.customized
    ? " · Customized — template updates leave it untouched"
    : definition !== undefined && template.version < definition.version
      ? ` · v${definition.version} available — update from the playbook card`
      : publishedAt === undefined
        ? ""
        : ` · Published ${relativeTime(publishedAt, Date.now())}`

  return (
    <p
      className="text-muted-foreground"
      title={publishedAt === undefined ? undefined : absoluteTime(publishedAt)}
    >
      From the {definition?.app?.title ?? template.key} template · v
      {template.version}
      {suffix}
    </p>
  )
}

function templateContractEntries(key: string): ContractEntrySummary[] {
  if (!(key in playbookTemplateContracts)) {
    return []
  }

  return playbookTemplateContracts[
    key as keyof typeof playbookTemplateContracts
  ].map((entry) => ({ ...entry, schema: entry.schema as unknown }))
}
