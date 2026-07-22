import { type ToolSurface } from "@contracts/integrations"
import { type Scope } from "@contracts/permissions/scope"
import { Link } from "@tanstack/react-router"
import {
  Archive,
  ChevronsUpDown,
  Component,
  ExternalLink,
  Workflow,
} from "lucide-react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { countLabel } from "@/lib/count"
import { ScopeDatum } from "../../shared/details"
import { SeparatorDot } from "../../shared/dot"
import { ToolCountSummary } from "../../shared/tools/summary"
import { capabilityGroupsFor } from "../format"
import { type ArtifactSummary } from "../types"
import { ArtifactActions } from "./actions"
import { ArtifactExpanded } from "./details"

export function ArtifactRow({
  artifact,
  isDeleting,
  isRestoring,
  now,
  onDelete,
  onRestore,
  showScope,
}: {
  artifact: ArtifactSummary
  isDeleting: boolean
  isRestoring: boolean
  now: number
  onDelete: (artifact: ArtifactSummary) => void
  onRestore: (artifact: ArtifactSummary) => void
  showScope: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const capabilityGroups = useCapabilityGroups(artifact)
  const surfaces = capabilityGroups.map((group) => group.type)

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
            <ArtifactIcon
              isArchived={artifact.archivedAt !== undefined}
              title={artifact.title}
            />
            <ArtifactSummaryBlock
              artifact={artifact}
              capabilityCount={artifact.capabilities.length}
              showScope={showScope}
              surfaces={surfaces}
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
            artifact={artifact}
            capabilityGroups={capabilityGroups}
            now={now}
          />
        ) : null}
      </article>
    </li>
  )
}

function ArtifactIcon({
  isArchived,
  title,
}: {
  isArchived: boolean
  title: string
}) {
  const Icon = isArchived ? Archive : Component

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
  showScope,
  surfaces,
}: {
  artifact: ArtifactSummary
  capabilityCount: number
  showScope: boolean
  surfaces: ToolSurface[]
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="truncate font-medium text-sm">{artifact.title}</h3>
        <PublishBadge artifact={artifact} />
      </div>
      <ArtifactInlineMeta
        access={showScope ? artifact.access : undefined}
        automationCount={artifact.automations.length}
        capabilityCount={capabilityCount}
        surfaces={surfaces}
      />
    </div>
  )
}

function PublishBadge({ artifact }: { artifact: ArtifactSummary }) {
  if (artifact.archivedAt !== undefined) {
    return <Badge variant="secondary">Archived</Badge>
  }

  return artifact.versionId === undefined ? (
    <Badge variant="secondary">Unpublished</Badge>
  ) : null
}

function ArtifactInlineMeta({
  access,
  automationCount,
  capabilityCount,
  surfaces,
}: {
  /** Omitted when the list is already filtered to a single scope. */
  access: Scope | undefined
  automationCount: number
  capabilityCount: number
  surfaces: ToolSurface[]
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
      <ToolCountSummary
        logoSize="sm"
        surfaces={surfaces}
        toolCount={capabilityCount}
      />
      <SeparatorDot className="text-muted-foreground/60" />
      <Workflow className="size-3.5" />
      <span className="text-foreground">
        {countLabel(automationCount, "automation")}
      </span>
      {access === undefined ? null : (
        <>
          <SeparatorDot className="text-muted-foreground/60" />
          <ScopeDatum scope={access} />
        </>
      )}
    </div>
  )
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
