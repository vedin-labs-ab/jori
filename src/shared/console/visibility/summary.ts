import { type Visibility, visibilityModeMarks } from "@contracts/visibility"
import { type VisibilityDirectory } from "./directory"
import { folderRestriction } from "./restriction"

export type VisibilitySubject = {
  visibility: Visibility
  folderId?: string
  ownerId?: string
}

/** Configured grants, qualified by folder ceilings; never an effective reader count. */
export function visibilitySummary(
  subject: VisibilitySubject,
  directory: VisibilityDirectory
) {
  const mode = subject.visibility.mode
  const audience = audienceSummary(subject, directory)
  const restriction =
    mode === "private" || subject.folderId === undefined
      ? null
      : folderRestriction(subject.folderId, directory)
  if (restriction === null) {
    return {
      mode,
      icon: mode,
      ...audience,
      configuredLabel: audience.label,
      marked: mode !== "organization",
    }
  }
  return {
    mode,
    icon: mode === "organization" ? ("folder" as const) : mode,
    configuredLabel: audience.label,
    label: mode === "organization" ? "Via folder" : audience.label,
    description: `${mode === "organization" ? `Access follows the folder. ${ownerAccess(subject, directory)}` : audience.description} ${restriction}`,
    marked: true,
  }
}

function audienceSummary(
  subject: VisibilitySubject,
  directory: VisibilityDirectory
) {
  const value = subject.visibility
  const mode = value.mode
  if (mode === "private") {
    return privateAudience(subject, directory)
  }
  if (value.mode === "teams" || value.mode === "people") {
    return selectedAudience(subject, value, directory)
  }
  return {
    label: visibilityModeMarks[mode],
    description: "Everyone in your organization can see this item.",
  }
}

function selectedAudience(
  subject: VisibilitySubject,
  value: Extract<Visibility, { mode: "people" | "teams" }>,
  directory: VisibilityDirectory
) {
  const teams = value.mode === "teams"
  const ids = [...new Set(teams ? value.teamIds : value.personIds)]
  const options = teams ? directory.teams : directory.people
  const names = ids.map(
    (id) => options?.find((option) => option.id === id)?.name
  )
  if (ids.length === 0) {
    return privateAudience(subject, directory)
  }
  const noun = teams ? "team" : "selected person"
  const plural = teams ? "teams" : "selected people"
  const label =
    ids.length === 1 && names[0] !== undefined
      ? names[0]
      : `${ids.length} ${ids.length === 1 ? noun : plural}`
  return {
    label,
    description: `Shared with ${selectedRecipients(names, teams)}. ${ownerAccess(subject, directory)}`,
  }
}

function selectedRecipients(names: (string | undefined)[], teams: boolean) {
  if (names.every((name): name is string => Boolean(name))) {
    const recipients = new Intl.ListFormat("en").format(
      teams ? names.map((name) => `the ${name} team`) : names
    )
    return teams ? `members of ${recipients}` : recipients
  }
  const noun = teams ? "team" : "person"
  const plural = teams ? "teams" : "people"
  return `${teams ? "members of " : ""}${names.length} selected ${names.length === 1 ? noun : plural}`
}

function viewerOwns(
  subject: VisibilitySubject,
  directory: VisibilityDirectory
) {
  return subject.ownerId === undefined || subject.ownerId === directory.viewerId
}

function privateAudience(
  subject: VisibilitySubject,
  directory: VisibilityDirectory
) {
  return viewerOwns(subject, directory)
    ? { label: "Only me", description: "Only you can see this item." }
    : { label: "Owner only", description: "Only the owner can see this item." }
}

function ownerAccess(
  subject: VisibilitySubject,
  directory: VisibilityDirectory
) {
  return viewerOwns(subject, directory)
    ? "You keep access."
    : "The owner keeps access."
}
