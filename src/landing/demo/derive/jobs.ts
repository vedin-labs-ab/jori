import { getNextCronRunAt } from "@contracts/jobs/schedule/cron"
import {
  type MoveResourceTarget,
  type MoveSubject,
  resourceSubject,
} from "@/shared/console/folders/types"
import {
  type Job,
  type JobFilter,
  type JobFormValues,
} from "@/shared/console/jobs/types"
import {
  type AudienceFilter,
  matchesAudienceFilter,
} from "@/shared/console/list/audience"
import { jobSurface } from "../fixtures/jobs"
import { ownerFields, viewerId } from "../fixtures/people"
import { demoPermissions } from "../fixtures/permissions"
import { type FolderId, type JobId, jobAudience } from "../fixtures/types"

/** The editor's save module, handed in by whoever loaded it: it carries
 *  the instructions codec, which the page must not pay for until a job is
 *  actually saved. */
export type JobArgs = typeof import("@/shared/console/jobs/editor/save/args")

export type JobFilters = {
  audience: AudienceFilter
  query: string
  status: JobFilter
}

/** The Jobs page's filters over the workspace's jobs, the way the list
 *  query narrows them: a status, a sharing facet, and a search. */
export function filterJobs(jobs: Job[], filters: JobFilters) {
  const query = filters.query.trim().toLowerCase()

  return jobs.filter(
    (job) =>
      (filters.status === "all" || job.status === filters.status) &&
      matchesAudienceFilter(job.audience, filters.audience) &&
      (query === "" ||
        `${job.name} ${job.instructions}`.toLowerCase().includes(query))
  )
}

export function hasJobFilters(filters: JobFilters) {
  return (
    filters.status !== "active" ||
    filters.audience !== "all" ||
    filters.query.trim() !== ""
  )
}

type SaveResult = { job: Job } | { error: string }

/** A job from the editor's values, through the same validation the console
 *  saves through: a new job with the id it is handed, or an existing one
 *  updated. */
export function jobFromValues(
  values: JobFormValues,
  options: { args: JobArgs; existing?: Job; id: JobId; at: number }
): SaveResult {
  return options.existing === undefined
    ? createdJob(options.args, values, options.id, options.at)
    : updatedJob(options.args, values, options.existing, options.at)
}

function createdJob(
  args: JobArgs,
  values: JobFormValues,
  id: JobId,
  at: number
): SaveResult {
  const result = args.createJobArgs(values, { permissions: demoPermissions })

  if ("error" in result) {
    return result
  }

  const { access, folderId, trigger, type, visibility, ...rest } = result.args
  const stored = visibility ?? { mode: "organization" as const }

  return {
    job: {
      ...rest,
      id,
      ...ownerFields(viewerId),
      key: undefined,
      audience: jobAudience(stored),
      visibility: stored,
      status: "active",
      folderId: folderId as FolderId | undefined,
      type,
      trigger: projectTrigger(trigger, at),
      access: projectAccess(access),
      createdAt: at,
      updatedAt: at,
      firedAt: undefined,
    },
  }
}

function updatedJob(
  args: JobArgs,
  values: JobFormValues,
  existing: Job,
  at: number
): SaveResult {
  const result = args.updateJobArgs(values, existing, {
    permissions: demoPermissions,
  })

  if ("error" in result) {
    return result
  }

  const { access, trigger, type, visibility, ...rest } = result.args
  const stored = visibility ?? existing.visibility

  return {
    job: {
      ...existing,
      ...rest,
      audience: jobAudience(stored),
      visibility: stored,
      ...(type === undefined || trigger === undefined
        ? {}
        : { type, trigger: projectTrigger(trigger, at) }),
      access: projectAccess(access),
      updatedAt: at,
    },
  }
}

type SavedArgs = Exclude<
  ReturnType<JobArgs["createJobArgs"]>,
  { error: string }
>
type SavedTrigger = SavedArgs["args"]["trigger"]

function projectTrigger(trigger: SavedTrigger, at: number): Job["trigger"] {
  if ("expression" in trigger) {
    return {
      ...trigger,
      nextAt: getNextCronRunAt(trigger.expression, at, trigger.timezone),
    }
  }

  if ("at" in trigger) {
    return { at: Date.parse(trigger.at) }
  }

  return {
    integration: trigger.integration,
    event: trigger.event,
    match: trigger.match,
  }
}

function projectAccess(access: SavedArgs["args"]["access"]): Job["access"] {
  return {
    webSearch: access.web,
    surfaces: access.integrations.map((entry) =>
      jobSurface(entry.integration, entry.tools)
    ),
  }
}

export function jobMoveTarget(job: Job): MoveResourceTarget {
  return {
    resourceType: "job",
    resourceId: job.id,
    name: job.name,
    folderId: job.folderId,
  }
}

export function jobMoveSubject(job: Job): MoveSubject {
  return resourceSubject([jobMoveTarget(job)])
}
