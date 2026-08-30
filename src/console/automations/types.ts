import {
  type AutomationEventIntegration,
  getDefaultAutomationEvent,
} from "@contracts/automations/events"
import { type Scope } from "@contracts/permissions/scope"
import { type Visibility } from "@contracts/permissions/visibility"
import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"
import { type AutomationSurfaceFormValue } from "./access"

export type AutomationList = FunctionReturnType<
  typeof api.automations.console.list
>
export type Automation = AutomationList["automations"][number]

export function automationControlAction(automation: Automation) {
  if (automation.type === "once" || automation.status === "completed") {
    return undefined
  }

  return automation.status === "paused" ? "resume" : "pause"
}

export const automationFilterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
] as const

export type AutomationFilter = (typeof automationFilterOptions)[number]["value"]

export const repeatOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekdays", value: "weekdays" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "custom" },
] as const

export type RepeatMode = (typeof repeatOptions)[number]["value"]
type AutomationTriggerType = "cron" | "once" | "event"

export type AutomationFormValues = {
  name: string
  instructions: string
  type: AutomationTriggerType
  repeat: RepeatMode
  time: string
  weekday: string
  monthDay: string
  cron: string
  timezone: string
  runAt: string
  eventIntegration: AutomationEventIntegration
  event: string
  eventMatch: Record<string, string>
  /** Who may see the automation; scope is its derived execution sharing —
   *  private runs as its person, everything else as the organization. */
  visibility: Visibility
  scope: Scope
  /** Creation-only: where the new automation is filed; null is the root.
   *  Edits move automations through the folder surfaces instead. */
  folderId: string | null
  webSearch: boolean
  surfaces: AutomationSurfaceFormValue[]
}

const defaultEvent = getDefaultAutomationEvent()

export const emptyAutomationForm: AutomationFormValues = {
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
