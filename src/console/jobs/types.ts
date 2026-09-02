import {
  getDefaultJobEvent,
  type JobEventIntegration,
} from "@contracts/jobs/events"
import { type Visibility } from "@contracts/visibility"
import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"
import { type JobScope, type JobSurfaceFormValue } from "./access"

export type JobList = FunctionReturnType<typeof api.jobs.console.list>
export type Job = JobList["jobs"][number]

export function jobControlAction(job: Job) {
  if (job.type === "once" || job.status === "completed") {
    return undefined
  }

  return job.status === "paused" ? "resume" : "pause"
}

export const jobFilterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
] as const

export type JobFilter = (typeof jobFilterOptions)[number]["value"]

export const repeatOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekdays", value: "weekdays" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "custom" },
] as const

export type RepeatMode = (typeof repeatOptions)[number]["value"]
type JobTriggerType = "cron" | "once" | "event"

export type JobFormValues = {
  name: string
  instructions: string
  type: JobTriggerType
  repeat: RepeatMode
  time: string
  weekday: string
  monthDay: string
  cron: string
  timezone: string
  runAt: string
  eventIntegration: JobEventIntegration
  event: string
  eventMatch: Record<string, string>
  /** Who may see the job; scope is its derived execution sharing —
   *  private runs as its person, everything else as the organization. */
  visibility: Visibility
  scope: JobScope
  /** Creation-only: where the new job is filed; null is the root.
   *  Edits move jobs through the folder surfaces instead. */
  folderId: string | null
  webSearch: boolean
  surfaces: JobSurfaceFormValue[]
}

const defaultEvent = getDefaultJobEvent()

export const emptyJobForm: JobFormValues = {
  name: "",
  instructions: "",
  type: "cron",
  repeat: "daily",
  time: "09:00",
  weekday: "1",
  monthDay: "1",
  cron: "",
  timezone: "UTC",
  runAt: "",
  eventIntegration: "slack",
  event: defaultEvent.value,
  eventMatch: {},
  visibility: { mode: "private" },
  scope: "personal",
  folderId: null,
  webSearch: true,
  surfaces: [],
}
