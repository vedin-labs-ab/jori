import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"
import {
  type ScheduleReadScope,
  type ScheduleSurfaceFormValue,
} from "./surfaces"

export type ScheduleList = FunctionReturnType<
  typeof api.scheduling.console.list
>
export type Schedule = ScheduleList["schedules"][number]

export const scheduleFilterOptions = [
  { label: "Active", value: "active" },
  { label: "All", value: "all" },
] as const

export type ScheduleFilter = (typeof scheduleFilterOptions)[number]["value"]

export const repeatOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekdays", value: "weekdays" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Custom", value: "custom" },
] as const

export type RepeatMode = (typeof repeatOptions)[number]["value"]

export type ScheduleFormValues = {
  name: string
  description: string
  type: Schedule["type"]
  repeat: RepeatMode
  time: string
  weekday: string
  monthDay: string
  cron: string
  runAt: string
  readScope: ScheduleReadScope
  webSearch: boolean
  surfaces: ScheduleSurfaceFormValue[]
}

export const emptyScheduleForm: ScheduleFormValues = {
  name: "",
  description: "",
  type: "recurring",
  repeat: "daily",
  time: "09:00",
  weekday: "1",
  monthDay: "1",
  cron: "",
  runAt: "",
  readScope: "allConnected",
  webSearch: true,
  surfaces: [],
}
