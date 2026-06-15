import { type ToolPermission } from "../../permissions/controller"
import {
  type AutomationSurfaceAccess,
  type AutomationSurfaceFormValue,
  type AutomationSurfaceIntegration,
  getAutomationSurfaceLabel,
} from "./catalog"
import { findAutomationSurfaceMentions } from "./mentions"
import { readAutomationSurfaceMentionMatches } from "./scan"
import {
  type AutomationToolPermissions,
  getDefaultAutomationSurfaceTools,
} from "./tools"

export function insertAutomationSurfaceMention(
  text: string,
  integration: AutomationSurfaceIntegration
) {
  if (findAutomationSurfaceMentions(text).includes(integration)) {
    return text
  }

  const marker = getAutomationSurfaceLabel(integration)
  const separator = text === "" || /\s$/.test(text) ? "" : " "

  return `${text}${separator}${marker}`
}

export function removeAutomationSurfaceMention(
  text: string,
  integration: AutomationSurfaceIntegration
) {
  const matches = readAutomationSurfaceMentionMatches(text)

  if (!matches.some((match) => match.integration === integration)) {
    return text
  }

  let next = ""
  let cursor = 0

  for (const match of matches) {
    next += text.slice(cursor, match.start)

    if (match.integration !== integration) {
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
  permissions?: AutomationToolPermissions
): AutomationSurfaceFormValue[] {
  const existing = new Map(
    surfaces.map((surface) => [surface.integration, uniqueTools(surface.tools)])
  )

  return findAutomationSurfaceMentions(text).map((integration) => ({
    integration,
    tools:
      existing.get(integration) ??
      getDefaultAutomationSurfaceTools(integration, permissions),
  }))
}

export function hasAutomationWriteSurface(
  surfaces: AutomationSurfaceFormValue[],
  permissions: ToolPermission[]
) {
  return surfaces.some((surface) =>
    getSelectedAutomationSurfacePermissions(surface, permissions).some(
      (permission) => permission.access === "write"
    )
  )
}

export function getAutomationSurfaceAccess(
  surface: AutomationSurfaceFormValue,
  permissions: ToolPermission[] | null | undefined
): AutomationSurfaceAccess | "" {
  if (!Array.isArray(permissions)) {
    return surface.tools.length === 0 ? "" : "both"
  }

  let read = false
  let write = false

  for (const permission of getSelectedAutomationSurfacePermissions(
    surface,
    permissions
  )) {
    if (permission.access === "read") {
      read = true
    }

    if (permission.access === "write") {
      write = true
    }
  }

  if (read && write) {
    return "both"
  }

  if (read) {
    return "read"
  }

  return write ? "write" : ""
}

export function getAutomationSurfaceAccessLabel(
  access: AutomationSurfaceAccess | ""
) {
  if (access === "") {
    return "No tools"
  }

  if (access === "both") {
    return "Read/write"
  }

  return access === "read" ? "Read" : "Write"
}

export function getSelectedAutomationSurfacePermissions(
  surface: AutomationSurfaceFormValue,
  permissions: ToolPermission[]
) {
  const selectedTools = new Set(surface.tools)

  return permissions.filter(
    (permission) =>
      permission.surface === surface.integration &&
      selectedTools.has(permission.tool)
  )
}

function uniqueTools(tools: string[]) {
  return [...new Set(tools)]
}
