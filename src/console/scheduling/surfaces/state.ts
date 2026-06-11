import {
  getScheduleSurfaceLabel,
  type ScheduleReadScope,
  type ScheduleSurfaceFormValue,
  type ScheduleSurfaceProvider,
} from "./catalog"
import { findScheduleSurfaceMentions } from "./mentions"
import { readScheduleSurfaceMentionMatches } from "./scan"

export function insertScheduleSurfaceMention(
  text: string,
  provider: ScheduleSurfaceProvider
) {
  if (findScheduleSurfaceMentions(text).includes(provider)) {
    return text
  }

  const marker = `@${getScheduleSurfaceLabel(provider)}`
  const separator = text === "" || /\s$/.test(text) ? "" : " "

  return `${text}${separator}${marker}`
}

export function removeScheduleSurfaceMention(
  text: string,
  provider: ScheduleSurfaceProvider
) {
  const matches = readScheduleSurfaceMentionMatches(text)

  if (!matches.some((match) => match.provider === provider)) {
    return text
  }

  let next = ""
  let cursor = 0

  for (const match of matches) {
    next += text.slice(cursor, match.start)

    if (match.provider !== provider) {
      next += text.slice(match.start, match.end)
    }

    cursor = match.end
  }

  return next
    .concat(text.slice(cursor))
    .replace(/\s{2,}/g, " ")
    .trim()
}

export function syncScheduleSurfaces(
  text: string,
  surfaces: ScheduleSurfaceFormValue[],
  readScope: ScheduleReadScope
): ScheduleSurfaceFormValue[] {
  const existing = new Map(
    surfaces.map((surface) => [surface.provider, surface.access])
  )

  return findScheduleSurfaceMentions(text).map((provider) => ({
    provider,
    access: existing.get(provider) ?? defaultAccess(readScope),
  }))
}

export function applyScheduleReadScope(
  surfaces: ScheduleSurfaceFormValue[],
  readScope: ScheduleReadScope
): ScheduleSurfaceFormValue[] {
  return surfaces.map((surface) => ({
    ...surface,
    access:
      readScope === "allConnected"
        ? surface.access || "read"
        : surface.access === "read"
          ? ""
          : surface.access,
  }))
}

export function hasScheduleWriteSurface(surfaces: ScheduleSurfaceFormValue[]) {
  return surfaces.some(
    (surface) => surface.access === "write" || surface.access === "both"
  )
}

function defaultAccess(readScope: ScheduleReadScope) {
  return readScope === "allConnected" ? "read" : ""
}
