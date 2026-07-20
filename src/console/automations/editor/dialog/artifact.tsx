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
} from "../../../artifacts/contract"
import { stateContractEntries } from "../../../artifacts/format"
import { absoluteTime, relativeTime } from "../../../shared/time"
import { FieldHelp } from "../../help"
import { type AutomationFormValues } from "../../types"

type ArtifactResult = FunctionReturnType<typeof api.artifacts.console.get>
type ArtifactDetail = Extract<
  ArtifactResult,
  { status: "ready" }
>["artifact"] & {}

/**
 * The automation's primary artifact: the default target for artifact state
 * tools and the resource its lifecycle is coupled to. Absent for plain
 * automations; prospective for playbook drafts that provision on create.
 */
export function AutomationArtifactSection({
  organizationId,
  values,
}: {
  organizationId: string
  values: AutomationFormValues
}) {
  const definition = playbookCatalog.find(
    (candidate) => candidate.key === values.playbook?.key
  )

  if (values.artifactId === undefined && definition?.artifact === undefined) {
    return null
  }

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex items-center gap-1.5">
        <Label>Artifact</Label>
        <FieldHelp label="Artifact help">
          <p>
            The artifact this automation works in — state is read and written
            here by default.
          </p>
          <p>Instructions can still reference other artifacts by ID.</p>
        </FieldHelp>
      </div>
      {values.artifactId === undefined ? (
        <ProspectiveArtifact definition={definition} values={values} />
      ) : (
        <LiveArtifact
          artifactId={values.artifactId}
          definition={definition}
          organizationId={organizationId}
        />
      )}
    </div>
  )
}

/** A playbook draft: nothing exists yet — creation provisions the artifact. */
function ProspectiveArtifact({
  definition,
  values,
}: {
  definition: PlaybookDefinition | undefined
  values: AutomationFormValues
}) {
  const artifact = definition?.artifact
  const binding = values.playbook

  if (artifact === undefined || binding === undefined) {
    return null
  }

  return (
    <ArtifactCard
      entries={templateContractEntries(binding.key)}
      footer="Set up from its template when you create this automation."
      lines={<p className="text-muted-foreground">{artifact.description}</p>}
      title={
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 truncate font-medium text-foreground text-sm">
            {artifact.title}
          </span>
          <TitleVersion version={binding.version} />
        </span>
      }
    />
  )
}

function LiveArtifact({
  artifactId,
  definition,
  organizationId,
}: {
  artifactId: NonNullable<AutomationFormValues["artifactId"]>
  definition: PlaybookDefinition | undefined
  organizationId: string
}) {
  const result = useQuery(api.artifacts.console.get, {
    organizationId,
    artifactId,
  })

  if (result === undefined) {
    return <Skeleton className="h-16 w-full" />
  }

  if (result.status !== "ready" || result.artifact === null) {
    return (
      <ArtifactCard
        entries={[]}
        lines={null}
        title={
          <span className="min-w-0 truncate text-muted-foreground">
            Artifact unavailable — it may have been deleted.
          </span>
        }
      />
    )
  }

  const artifact = result.artifact

  return (
    <ArtifactCard
      entries={stateContractEntries(artifact.contract?.state)}
      lines={
        <>
          {definition?.artifact === undefined ? null : (
            <p className="text-muted-foreground">
              {definition.artifact.description}
            </p>
          )}
          {provenanceLine(artifact, definition)}
        </>
      }
      title={
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate font-medium text-foreground text-sm">
              {artifact.title}
            </span>
            <TitleVersion version={artifact.template?.version} />
          </span>
          <Link
            className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs underline-offset-2 hover:text-foreground hover:underline"
            params={{ artifactId: artifact.artifactId }}
            to="/artifacts/$artifactId"
          >
            Open <ArrowUpRight className="size-3" />
          </Link>
        </span>
      }
    />
  )
}

/** One quiet card telling the artifact's story: identity first, then its
 *  state entries under a State label, with an optional process hint as a
 *  full-bleed footer strip — the Context card's grammar exactly. */
function ArtifactCard({
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
  artifact: ArtifactDetail,
  definition: PlaybookDefinition | undefined
) {
  const template = artifact.template

  if (template == null) {
    return null
  }

  const publishedAt = artifact.versions.find(
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
      From the {definition?.artifact?.title ?? template.key} template · v
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
