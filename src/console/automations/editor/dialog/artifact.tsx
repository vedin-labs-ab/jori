import {
  type PlaybookDefinition,
  playbookCatalog,
} from "@contracts/playbooks/catalog"
import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { ArrowUpRight } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../../convex/_generated/api"
import { type AutomationFormValues } from "../../types"
import { FieldHelp } from "./help"

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

  if (artifact === undefined || values.playbook === undefined) {
    return null
  }

  return (
    <div className={boxClassName}>
      <p>
        <span className="font-medium text-foreground">
          {artifact.title} artifact
        </span>{" "}
        — {artifact.description}
      </p>
      <p className="text-muted-foreground">
        Created from the {values.playbook.key} template (v
        {values.playbook.version}) when this automation is created.
      </p>
    </div>
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
    return <Skeleton className="h-16 w-full" />
  }

  if (result.status !== "ready" || result.artifact === null) {
    return (
      <div className={boxClassName}>
        <p className="text-muted-foreground">
          Artifact unavailable — it may have been deleted.
        </p>
      </div>
    )
  }

  const artifact = result.artifact

  return (
    <div className={boxClassName}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{artifact.title}</span>
        <Link
          className="flex shrink-0 items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          params={{ artifactId: artifact.artifactId }}
          to="/artifacts/$artifactId"
        >
          Open <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <TemplateFact artifact={artifact} definition={definition} />
      <ContractFacts artifact={artifact} />
    </div>
  )
}

/** Template provenance, plus a passive pointer when the playbook catalog
 *  has moved past this artifact — the update itself lives on the card. */
function TemplateFact({
  artifact,
  definition,
}: {
  artifact: ArtifactDetail
  definition: PlaybookDefinition | undefined
}) {
  const template = artifact.template

  if (template == null) {
    return null
  }

  const behind =
    definition !== undefined && template.version < definition.version

  return (
    <p className="text-muted-foreground">
      From the {template.key} template · v{template.version}
      {template.customized
        ? " · Customized — template updates leave it untouched"
        : behind
          ? ` · v${definition.version} available — update from the playbook card`
          : ""}
    </p>
  )
}

function ContractFacts({ artifact }: { artifact: ArtifactDetail }) {
  const entries = artifact.contract?.state ?? []

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="grid gap-0.5 text-muted-foreground">
      {entries.map((entry) => (
        <p key={entry.name} className="truncate" title={entry.description}>
          <span className="font-medium text-foreground">{entry.name}</span> ·{" "}
          {entry.scope} · {entry.schemaName} v{entry.schemaVersion}
          {entry.description === undefined ? "" : ` — ${entry.description}`}
        </p>
      ))}
    </div>
  )
}

const boxClassName = "grid gap-1 rounded-md border px-3 py-2.5 text-xs"
