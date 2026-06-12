import {
  type AutomationReadScope,
  type AutomationSurfaceAccess,
  type AutomationSurfaceFormValue,
  type AutomationSurfaceProvider,
  getAutomationSurfaceLabel,
} from "./catalog"
import { findAutomationSurfaceMentions } from "./mentions"
import { readAutomationSurfaceMentionMatches } from "./scan"

export function insertAutomationSurfaceMention(
  text: string,
  provider: AutomationSurfaceProvider
) {
  if (findAutomationSurfaceMentions(text).includes(provider)) {
    return text
  }

  const marker = getAutomationSurfaceLabel(provider)
  const separator = text === "" || /\s$/.test(text) ? "" : " "

  return `${text}${separator}${marker}`
}

export function removeAutomationSurfaceMention(
  text: string,
  provider: AutomationSurfaceProvider
) {
  const matches = readAutomationSurfaceMentionMatches(text)

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

export function syncAutomationSurfaces(
  text: string,
  surfaces: AutomationSurfaceFormValue[],
  readScope: AutomationReadScope
): AutomationSurfaceFormValue[] {
  const existing = new Map(
    surfaces.map((surface) => [surface.provider, surface.access])
  )

  return findAutomationSurfaceMentions(text).map((provider) => ({
    provider,
    access: normalizeAutomationSurfaceAccess(
      existing.get(provider) ?? defaultAutomationSurfaceAccess(readScope),
      readScope
    ),
  }))
}

export function applyAutomationReadScope(
  surfaces: AutomationSurfaceFormValue[],
  readScope: AutomationReadScope
): AutomationSurfaceFormValue[] {
  return surfaces.map((surface) => ({
    ...surface,
    access:
      readScope === "allConnected"
        ? normalizeAutomationSurfaceAccess(surface.access, readScope)
        : surface.access === "read"
          ? ""
          : surface.access,
  }))
}

export function hasAutomationWriteSurface(
  surfaces: AutomationSurfaceFormValue[]
) {
  return surfaces.some(
    (surface) => surface.access === "write" || surface.access === "both"
  )
}

export function defaultAutomationSurfaceAccess(readScope: AutomationReadScope) {
  return readScope === "allConnected" ? "read" : ""
}

export function getNextAutomationSurfaceAccess(
  access: AutomationSurfaceFormValue["access"],
  readScope: AutomationReadScope
): AutomationSurfaceAccess {
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

function normalizeAutomationSurfaceAccess(
  access: AutomationSurfaceFormValue["access"],
  readScope: AutomationReadScope
) {
  if (readScope !== "allConnected") {
    return access
  }

  return access === "write" || access === "both" ? "both" : "read"
}

export function getAutomationSurfaceAccessLabel(
  access: AutomationSurfaceFormValue["access"]
) {
  if (access === "") {
    return "Choose access"
  }

  if (access === "both") {
    return "Read/write"
  }

  return access === "read" ? "Read" : "Write"
}
