import { type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"

export type ScheduleList = FunctionReturnType<
  typeof api.scheduling.console.list
>
export type Schedule = ScheduleList["schedules"][number]

export const scheduleFilterOptions = [
  { label: "Active", value: "active" },
  { label: "All", value: "all" },
] as const

export type ScheduleFilter = (typeof scheduleFilterOptions)[number]["value"]

export type ScheduleFormValues = {
  name: string
  description: string
  type: Schedule["type"]
  cron: string
  runAt: string
  channelId: string
  threadId: string
}

export const emptyScheduleForm: ScheduleFormValues = {
  name: "",
  description: "",
  type: "recurring",
  cron: "",
  runAt: "",
  channelId: "",
  threadId: "",
}
