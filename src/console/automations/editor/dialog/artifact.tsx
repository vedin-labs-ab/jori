import {
  type PlaybookDefinition,
  playbookCatalog,
} from "@contracts/playbooks/catalog"
import { playbookTemplateContracts } from "@contracts/playbooks/generated"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { ArrowUpRight, Database, LayoutTemplate } from "lucide-react"
import { type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../../convex/_generated/api"
import { absoluteTime, relativeTime } from "../../../shared/time"
import { type AutomationFormValues } from "../../types"
import { FieldHelp } from "./help"

type ArtifactResult = FunctionReturnType<typeof api.artifacts.console.get>
type ArtifactDetail = Extract<
  ArtifactResult,
  { status: "ready" }
>["artifact"] & {}

type ContractEntrySummary = {
  name: string
  scope: string
  description: string | undefined
  schemaName: string
  schemaVersion: number
}

/**
 * The automation's primary artifact: the default target for artifact state
 * tools and the resource its lifecycle is coupled to. Absent for plain
 * automations; prospective for playbook drafts that provision on create.
 */
export function AutomationArtifactSection({
  tenantId,
  values,
}: {
  tenantId: string
  values: AutomationFormValues
}) {
  const definition = playbookCatalog.find(
    (candidate) => candidate.key === values.playbook?.key
  )

  if (values.artifactId === undefined && definition?.artifact === undefined) {
    return null
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label>Artifact</Label>
        <FieldHelp label="Artifact help">
          <p>
            The primary artifact this automation drives. Artifact state tools
            default to it; instructions can still reference other artifacts by
            ID.
          </p>
        </FieldHelp>
      </div>
      {values.artifactId === undefined ? (
        <ProspectiveArtifact definition={definition} values={values} />
      ) : (
        <LiveArtifact
          artifactId={values.artifactId}
          definition={definition}
          tenantId={tenantId}
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
    <ArtifactFacts
      detail={`Created from the ${binding.key} template (v${binding.version}) when this automation is created.`}
      entries={templateContractEntries(binding.key)}
      title={
        <span className="min-w-0">
          <span className="font-medium text-foreground">
            {artifact.title} artifact
          </span>
          <span className="text-muted-foreground">
            {" "}
            — {artifact.description}
          </span>
        </span>
      }
    />
  )
}

function LiveArtifact({
  artifactId,
  definition,
  tenantId,
}: {
  artifactId: NonNullable<AutomationFormValues["artifactId"]>
  definition: PlaybookDefinition | undefined
  tenantId: string
}) {
  const result = useQuery(api.artifacts.console.get, { tenantId, artifactId })

  if (result === undefined) {
    return <Skeleton className="h-12 w-full" />
  }

  if (result.status !== "ready" || result.artifact === null) {
    return (
      <p className="text-muted-foreground text-xs">
        Artifact unavailable — it may have been deleted.
      </p>
    )
  }

  const artifact = result.artifact

  return (
    <ArtifactFacts
      detail={provenanceDetail(artifact, definition)}
      entries={artifactContractEntries(artifact)}
      title={
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate font-medium text-foreground">
            {artifact.title}
          </span>
          <Link
            className="flex shrink-0 items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
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

/** Quiet icon rows, matching the playbook dialog's fact sections — the
 *  bordered look is reserved for the Instructions editor below. */
function ArtifactFacts({
  detail,
  entries,
  title,
}: {
  detail: ReactNode
  entries: ContractEntrySummary[]
  title: ReactNode
}) {
  return (
    <div className="grid gap-1.5 text-xs">
      <div className="flex items-start gap-1.5">
        <LayoutTemplate className="mt-px size-3.5 shrink-0 text-muted-foreground" />
        {title}
      </div>
      {detail === null ? null : (
        <p className="pl-5 text-muted-foreground">{detail}</p>
      )}
      {entries.map((entry) => (
        <div className="flex items-start gap-1.5" key={entry.name}>
          <Database className="mt-px size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate" title={entry.description}>
            <span
              className="font-medium text-foreground"
              title={`${entry.schemaName} v${entry.schemaVersion}`}
            >
              {entry.name}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {entry.scope}
              {entry.description === undefined ? "" : ` — ${entry.description}`}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Template provenance with one quiet suffix: customized wins, then an
 *  available update (applied from the playbook card), then recency. */
function provenanceDetail(
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
    <span
      title={publishedAt === undefined ? undefined : absoluteTime(publishedAt)}
    >
      From the {template.key} template · v{template.version}
      {suffix}
    </span>
  )
}

function templateContractEntries(key: string): ContractEntrySummary[] {
  if (!(key in playbookTemplateContracts)) {
    return []
  }

  return playbookTemplateContracts[
    key as keyof typeof playbookTemplateContracts
  ].map((entry) => ({ ...entry }))
}

function artifactContractEntries(
  artifact: ArtifactDetail
): ContractEntrySummary[] {
  return (artifact.contract?.state ?? []).map((entry) => ({
    name: entry.name,
    scope: entry.scope,
    description: entry.description,
    schemaName: entry.schemaName,
    schemaVersion: entry.schemaVersion,
  }))
}
