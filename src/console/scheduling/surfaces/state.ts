import {
  getScheduleSurfaceLabel,
  type ScheduleReadScope,
  type ScheduleSurfaceAccess,
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

  const marker = getScheduleSurfaceLabel(provider)
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
    access: normalizeScheduleSurfaceAccess(
      existing.get(provider) ?? defaultScheduleSurfaceAccess(readScope),
      readScope
    ),
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
        ? normalizeScheduleSurfaceAccess(surface.access, readScope)
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

export function defaultScheduleSurfaceAccess(readScope: ScheduleReadScope) {
  return readScope === "allConnected" ? "read" : ""
}

export function getNextScheduleSurfaceAccess(
  access: ScheduleSurfaceFormValue["access"],
  readScope: ScheduleReadScope
): ScheduleSurfaceAccess {
  if (readScope === "allConnected") {
    return access === "both" ? "read" : "both"
  }

  if (access === "") {
    return "read"
  }

  if (access === "read") {
    return "write"
  }

  return access === "write" ? "both" : "read"
}

function normalizeScheduleSurfaceAccess(
  access: ScheduleSurfaceFormValue["access"],
  readScope: ScheduleReadScope
) {
  if (readScope !== "allConnected") {
    return access
  }

  return access === "write" || access === "both" ? "both" : "read"
}

export function getScheduleSurfaceAccessLabel(
  access: ScheduleSurfaceFormValue["access"]
) {
  if (access === "") {
    return "Choose access"
  }

  if (access === "both") {
    return "Read/write"
  }

  return access === "read" ? "Read" : "Write"
}
