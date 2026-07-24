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
import { type AppSummary } from "../types"
import { AppActions } from "./actions"
import { AppExpanded } from "./details"

export function AppRow({
  app,
  isDeleting,
  isRestoring,
  now,
  onDelete,
  onRestore,
  showScope,
}: {
  app: AppSummary
  isDeleting: boolean
  isRestoring: boolean
  now: number
  onDelete: (app: AppSummary) => void
  onRestore: (app: AppSummary) => void
  showScope: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const capabilityGroups = useCapabilityGroups(app)
  const surfaces = capabilityGroups.map((group) => group.type)

  return (
    <li>
      <article className="overflow-hidden rounded-md bg-background ring-1 ring-foreground/10 ring-inset transition-shadow focus-within:ring-2 focus-within:ring-ring/50">
        <div className="flex items-center">
          <button
            aria-expanded={isOpen}
            className="group/app-row grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-3 p-3 text-left outline-none md:grid-cols-[auto_1fr_auto]"
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <AppIcon
              isArchived={app.archivedAt !== undefined}
              title={app.title}
            />
            <AppSummaryBlock
              app={app}
              capabilityCount={app.capabilities.length}
              showScope={showScope}
              surfaces={surfaces}
            />
          </button>
          <AppControls
            app={app}
            isDeleting={isDeleting}
            isRestoring={isRestoring}
            onDelete={onDelete}
            onRestore={onRestore}
          />
        </div>
        {isOpen ? (
          <AppExpanded
            app={app}
            capabilityGroups={capabilityGroups}
            now={now}
          />
        ) : null}
      </article>
    </li>
  )
}

function AppIcon({
  isArchived,
  title,
}: {
  isArchived: boolean
  title: string
}) {
  const Icon = isArchived ? Archive : Component

  return (
    <span
      aria-label={`${title} app`}
      className="relative inline-flex size-4 shrink-0 items-center justify-center"
      role="img"
    >
      <Icon className="size-4 transition-opacity duration-150 group-focus-visible/app-row:opacity-0 group-hover/app-row:opacity-0" />
      <ChevronsUpDown className="pointer-events-none absolute size-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-focus-visible/app-row:opacity-100 group-hover/app-row:opacity-100" />
    </span>
  )
}

function AppSummaryBlock({
  app,
  capabilityCount,
  showScope,
  surfaces,
}: {
  app: AppSummary
  capabilityCount: number
  showScope: boolean
  surfaces: ToolSurface[]
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="truncate font-medium text-sm">{app.title}</h3>
        <PublishBadge app={app} />
      </div>
      <AppInlineMeta
        access={showScope ? app.access : undefined}
        automationCount={app.automations.length}
        capabilityCount={capabilityCount}
        surfaces={surfaces}
      />
    </div>
  )
}

function PublishBadge({ app }: { app: AppSummary }) {
  if (app.archivedAt !== undefined) {
    return <Badge variant="secondary">Archived</Badge>
  }

  return app.versionId === undefined ? (
    <Badge variant="secondary">Unpublished</Badge>
  ) : null
}

function AppInlineMeta({
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

function AppControls({
  app,
  isDeleting,
  isRestoring,
  onDelete,
  onRestore,
}: {
  app: AppSummary
  isDeleting: boolean
  isRestoring: boolean
  onDelete: (app: AppSummary) => void
  onRestore: (app: AppSummary) => void
}) {
  const isArchived = app.archivedAt !== undefined

  return (
    <div className="mr-3 flex shrink-0 items-center gap-2">
      {isArchived ? null : (
        <Button asChild size="sm" variant="outline">
          <Link params={{ appId: app.appId }} to="/apps/$appId">
            <ExternalLink data-icon="inline-start" />
            View
          </Link>
        </Button>
      )}
      <AppActions
        app={app}
        isDeleting={isDeleting}
        isRestoring={isRestoring}
        onDelete={onDelete}
        onRestore={onRestore}
      />
    </div>
  )
}

function useCapabilityGroups(app: AppSummary) {
  return useMemo(() => capabilityGroupsFor(app), [app])
}
