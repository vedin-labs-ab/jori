import { type Infer } from "convex/values"
import { type IntegrationProvider } from "../providers/catalog"
import { type scheduleOutput } from "./schema"

export type ScheduleOutput = Infer<typeof scheduleOutput>
export type ScheduleSurfaceAccess = ScheduleOutput["surfaces"][number]["access"]
export type ScheduleReadScope = ScheduleOutput["readScope"]

export const scheduleProviderLabels = {
  github: "GitHub",
  gmail: "Gmail",
  googleCalendar: "Google Calendar",
  googleDrive: "Google Drive",
  linear: "Linear",
  microsoftCalendar: "Microsoft Calendar",
  microsoftEmail: "Outlook Mail",
  notion: "Notion",
  slack: "Slack",
} satisfies Record<IntegrationProvider, string>

export function normalizeScheduleOutput(
  output: ScheduleOutput
): ScheduleOutput {
  const seen = new Set<IntegrationProvider>()
  const surfaces: ScheduleOutput["surfaces"] = []

  for (const surface of output.surfaces) {
    if (seen.has(surface.provider)) {
      throw new Error(
        `${scheduleProviderLabels[surface.provider]} is listed more than once.`
      )
    }

    seen.add(surface.provider)
    surfaces.push(surface)
  }

  if (!hasScheduleWriter({ ...output, surfaces })) {
    throw new Error("At least one write integration is required.")
  }

  return {
    readScope: output.readScope,
    webSearch: output.webSearch,
    surfaces,
  }
}

export function hasScheduleWriter(output: ScheduleOutput) {
  return output.surfaces.some((surface) => canWrite(surface.access))
}

export function getScheduleProviderAccess(
  output: ScheduleOutput,
  provider: IntegrationProvider
): ScheduleSurfaceAccess | "none" {
  const explicitAccess = output.surfaces.find(
    (surface) => surface.provider === provider
  )?.access

  if (output.readScope === "allConnected") {
    if (explicitAccess === "write" || explicitAccess === "both") {
      return "both"
    }

    return "read"
  }

  return explicitAccess ?? "none"
}

export function canRead(access: ScheduleSurfaceAccess | "none") {
  return access === "read" || access === "both"
}

export function canWrite(access: ScheduleSurfaceAccess | "none") {
  return access === "write" || access === "both"
}

export function scheduleAccessLabel(access: ScheduleSurfaceAccess) {
  if (access === "both") {
    return "Read/write"
  }

  return access === "read" ? "Read" : "Write"
}
