import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"
import {
  type AutomationEventProvider,
  getDefaultAutomationEvent,
} from "../../../convex/automations/events"
import {
  type AutomationReadScope,
  type AutomationSurfaceFormValue,
} from "./surfaces"

export type AutomationList = FunctionReturnType<
  typeof api.automations.console.list
>
export type Automation = AutomationList["automations"][number]

export const automationFilterOptions = [
  { label: "Active", value: "active" },
  { label: "All", value: "all" },
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
export type AutomationTriggerType = "cron" | "once" | "event"

export type AutomationFormValues = {
  name: string
  instructions: string
  type: AutomationTriggerType
  repeat: RepeatMode
  time: string
  weekday: string
  monthDay: string
  cron: string
  runAt: string
  eventProvider: AutomationEventProvider
  event: string
  eventResource: string
  readScope: AutomationReadScope
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
  runAt: "",
  eventProvider: "notion",
  event: defaultEvent.value,
  eventResource: "",
  readScope: "allConnected",
  webSearch: true,
  surfaces: [],
}
