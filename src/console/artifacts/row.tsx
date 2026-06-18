import { type ToolSurface } from "@contracts/integrations"
import { Link } from "@tanstack/react-router"
import {
  Archive,
  Building2,
  ChevronsUpDown,
  Clock,
  ExternalLink,
  User,
  Workflow,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { absoluteTime, relativeTime } from "../runs/format"
import { ToolCountSummary } from "../tools/summary"
import { ArtifactActions } from "./actions"
import { ArtifactExpanded } from "./details"
import {
  automationCountLabel,
  capabilityGroupsFor,
  toolSurfaceList,
} from "./format"
import { type ArtifactSummary } from "./types"

export function ArtifactRow({
  artifact,
  isDeleting,
  isRestoring,
  now,
  onDelete,
  onRestore,
}: {
  artifact: ArtifactSummary
  isDeleting: boolean
  isRestoring: boolean
  now: number
  onDelete: (artifact: ArtifactSummary) => void
  onRestore: (artifact: ArtifactSummary) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const capabilityGroups = useCapabilityGroups(artifact)
  const surfaces = toolSurfaceList(capabilityGroups)

  return (
    <li>
      <article className="overflow-hidden rounded-md bg-background ring-1 ring-foreground/10 ring-inset transition-shadow focus-within:ring-2 focus-within:ring-ring/50">
        <div className="flex items-center">
          <button
            aria-expanded={isOpen}
            className="group/artifact-row grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-3 p-3 text-left outline-none md:grid-cols-[auto_1fr_auto]"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <ArtifactIcon access={artifact.access} title={artifact.title} />
            <ArtifactSummaryBlock
              artifact={artifact}
              capabilityCount={artifact.capabilities.length}
              surfaces={surfaces}
              now={now}
            />
          </button>
          <ArtifactControls
            artifact={artifact}
            isDeleting={isDeleting}
            isRestoring={isRestoring}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        </div>
        {isOpen ? (
          <ArtifactExpanded
            automations={artifact.automations}
            capabilityGroups={capabilityGroups}
            now={now}
          />
        ) : null}
      </article>
    </li>
  )
}

function ArtifactIcon({
  access,
  title,
}: {
  access: ArtifactSummary["access"]
  title: string
}) {
  const Icon = access === "organization" ? Building2 : User

  return (
    <span
      aria-label={`${title} artifact`}
      className="relative inline-flex size-4 shrink-0 items-center justify-center"
      role="img"
    >
      <Icon className="size-4 transition-opacity duration-150 group-focus-visible/artifact-row:opacity-0 group-hover/artifact-row:opacity-0" />
      <ChevronsUpDown className="pointer-events-none absolute size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-focus-visible/artifact-row:opacity-100 group-hover/artifact-row:opacity-100" />
    </span>
  )
}

function ArtifactSummaryBlock({
  artifact,
  capabilityCount,
  surfaces,
  now,
}: {
  artifact: ArtifactSummary
  capabilityCount: number
  surfaces: ToolSurface[]
  now: number
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="truncate font-medium text-sm">{artifact.title}</h3>
        <PublishBadge artifact={artifact} />
      </div>
      <ArtifactInlineMeta
        automationCount={artifact.automations.length}
        capabilityCount={capabilityCount}
        surfaces={surfaces}
        now={now}
        updatedAt={artifact.updatedAt}
      />
    </div>
  )
}

function PublishBadge({ artifact }: { artifact: ArtifactSummary }) {
  if (artifact.archivedAt !== undefined) {
    return (
      <Badge variant="secondary">
        <Archive data-icon="inline-start" />
        Archived
      </Badge>
    )
  }

  return artifact.versionId === undefined ? (
    <Badge variant="secondary">Unpublished</Badge>
  ) : null
}

function ArtifactInlineMeta({
  automationCount,
  capabilityCount,
  surfaces,
  now,
  updatedAt,
}: {
  automationCount: number
  capabilityCount: number
  surfaces: ToolSurface[]
  now: number
  updatedAt: number
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
      <ToolCountSummary
        logoSize="sm"
        surfaces={surfaces}
        toolCount={capabilityCount}
      />
      <SeparatorDot />
      <Workflow className="size-3.5" />
      <MetaValue>{automationCountLabel(automationCount)}</MetaValue>
      <SeparatorDot />
      <Clock className="size-3.5" />
      <span title={absoluteTime(updatedAt)}>
        Updated {relativeTime(updatedAt, now)}
      </span>
    </div>
  )
}

function MetaValue({ children }: { children: string }) {
  return <span className="font-medium text-foreground">{children}</span>
}

function SeparatorDot() {
  return <span className="text-muted-foreground/60">•</span>
}

function ArtifactControls({
  artifact,
  isDeleting,
  isRestoring,
  onDelete,
  onRestore,
}: {
  artifact: ArtifactSummary
  isDeleting: boolean
  isRestoring: boolean
  onDelete: (artifact: ArtifactSummary) => void
  onRestore: (artifact: ArtifactSummary) => void
}) {
  const isArchived = artifact.archivedAt !== undefined

  return (
    <div className="mr-3 flex shrink-0 items-center gap-2">
      {isArchived ? null : (
        <Button asChild size="sm" variant="outline">
          <Link
            params={{ artifactId: artifact.artifactId }}
            to="/artifacts/$artifactId"
          >
            <ExternalLink data-icon="inline-start" />
            View
          </Link>
        </Button>
      )}
      <ArtifactActions
        artifact={artifact}
        isDeleting={isDeleting}
        isRestoring={isRestoring}
        onDelete={onDelete}
        onRestore={onRestore}
      />
    </div>
  )
}

function useCapabilityGroups(artifact: ArtifactSummary) {
  return useMemo(() => capabilityGroupsFor(artifact), [artifact])
}
