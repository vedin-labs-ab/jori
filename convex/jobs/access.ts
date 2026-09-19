import { type Infer } from "convex/values"
import {
  getToolPermission,
  isCoreTool,
  isUnattendedToolMode,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
} from "../../contracts/permissions"
import { type Doc, type Id } from "../_generated/dataModel"
import { resolveIntegrationForPrincipal } from "../integrations/resolve"
import { listPermissionOverrides } from "../permissions/read"
import { type ExecutionPrincipal } from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"
import {
  type Access,
  type Integration,
  isAccessWithin,
  type ToolSurface,
  toolSurfaceLabel,
} from "../shared/integrations"
import { createSight, type Gate, type Sight } from "../visibility/sight"
import { getOrganizationJob } from "./lifecycle/read"
import { type access, type accessInput } from "./schema"

export type JobAccess = Infer<typeof access>
export type JobAccessInput = Infer<typeof accessInput>
type AccessLevel = "none" | "read" | "write" | "both"

type JobGateDoc = Pick<
  Doc<"jobs">,
  "organizationId" | "visibility" | "principal" | "createdBy"
> &
  Partial<Pick<Doc<"jobs">, "folderId">>

/** A job's owner: the person it executes as, or its creator. */
export function jobOwner(
  job: Pick<Doc<"jobs">, "principal" | "createdBy">
): Id<"persons"> | undefined {
  return job.principal.kind === "person"
    ? job.principal.personId
    : job.createdBy
}

/** The visibility gate for a job, for Sight.canSee. */
export function jobGate(job: JobGateDoc): Gate {
  return {
    organizationId: job.organizationId,
    ownerId: jobOwner(job),
    folderId: job.folderId,
    visibility: job.visibility,
  }
}

/** Whether the viewer behind the Sight may see the job. */
export async function canSeeJob(sight: Sight, job: JobGateDoc) {
  return await sight.canSee(jobGate(job))
}

/** Missing, foreign, and invisible jobs read the same, so a caller
 *  cannot probe what exists behind a visibility gate. The folder tree's
 *  guard reads the same way for the same reason. */
export async function requireVisibleJob(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId?: Id<"persons">
    jobId: Id<"jobs">
  }
) {
  const job = await getOrganizationJob(ctx, args.organizationId, args.jobId)

  if (!(await canSeeJob(createSight(ctx, args), job))) {
    throw new Error("Job not found.")
  }

  return job
}

export async function resolveAccessInput(
  ctx: QueryLikeCtx,
  args: {
    access: JobAccessInput
    /** The contract of the run asking, which the job may not exceed. */
    ceiling?: Access
    principal: ExecutionPrincipal
    organizationId: string
  }
): Promise<JobAccess> {
  const integrations = normalizeAccessIntegrations(args.access.integrations)
  const jori = uniqueTools(args.access.jori)

  await requireJobAccessPolicy(ctx, {
    surfaces: [...integrations, { integration: "jori", tools: jori }],
    organizationId: args.organizationId,
  })

  const access = {
    integrations: await Promise.all(
      integrations.map(async (integration) => ({
        id: (
          await resolveIntegrationForPrincipal(ctx, {
            integration: integration.integration,
            principal: args.principal,
            organizationId: args.organizationId,
          })
        )._id,
        tools: integration.tools,
      }))
    ),
    jori,
  }

  requireAccessWithin(access, args.ceiling)

  return access
}

/** A run passes on what it holds and no more, so a job it creates or edits
 *  cannot reach past the run's own contract. */
export function requireAccessWithin(access: Access, ceiling?: Access) {
  if (ceiling !== undefined && !isAccessWithin(access, ceiling)) {
    throw new Error("A job cannot hold tools the run managing it lacks.")
  }
}

async function requireJobAccessPolicy(
  ctx: QueryLikeCtx,
  args: {
    surfaces: Array<{
      integration: ToolSurface
      tools: string[]
    }>
    organizationId: string
  }
) {
  const toolModes = resolveToolModes(
    await listPermissionOverrides(ctx, args.organizationId)
  )
  let hasWriteTool = false

  for (const surface of args.surfaces) {
    for (const tool of surface.tools) {
      if (requireJobTool(toolModes, surface.integration, tool)) {
        hasWriteTool = true
      }
    }
  }

  // A job has no conversation to answer in, so without a write tool its
  // work would reach nobody.
  if (!hasWriteTool) {
    throw new Error("Give the job at least one write tool.")
  }
}

function requireJobTool(
  toolModes: ReadonlyMap<string, PermissionMode>,
  surface: ToolSurface,
  tool: string
) {
  const permission = getToolPermission(tool)

  if (
    permission === undefined ||
    permission.surface !== surface ||
    isCoreTool(tool)
  ) {
    throw new Error(`Unknown ${toolSurfaceLabel(surface)} tool: ${tool}`)
  }

  const mode = resolveToolMode(toolModes, tool)

  if (!isUnattendedToolMode(mode)) {
    throw new Error(
      `${permission.label} is ${permissionModeLabel(mode)} and cannot run in jobs.`
    )
  }

  return permission.access === "write"
}

function normalizeAccessIntegrations(
  integrations: JobAccessInput["integrations"]
) {
  const toolsByIntegration = new Map<Integration, Set<string>>()

  for (const integration of integrations) {
    const tools = uniqueTools(integration.tools)

    if (tools.length === 0) {
      throw new Error(
        "Select at least one tool for each mentioned integration."
      )
    }

    const integrationTools =
      toolsByIntegration.get(integration.integration) ?? new Set()

    for (const tool of tools) {
      integrationTools.add(tool)
    }

    toolsByIntegration.set(integration.integration, integrationTools)
  }

  return [...toolsByIntegration].map(([integration, tools]) => ({
    integration,
    tools: [...tools],
  }))
}

function uniqueTools(tools: string[]) {
  return [...new Set(tools)]
}

export function resolveToolAccessLevel(tools: readonly string[]): AccessLevel {
  let read = false
  let write = false

  for (const tool of tools) {
    const permission = getToolPermission(tool)

    if (permission?.access === "read") {
      read = true
    }

    if (permission?.access === "write") {
      write = true
    }
  }

  if (read && write) {
    return "both"
  }

  if (read) {
    return "read"
  }

  return write ? "write" : "none"
}

function permissionModeLabel(mode: PermissionMode) {
  if (mode === "prompted") {
    return "set to ask first"
  }

  return mode === "blocked" ? "blocked" : mode
}
