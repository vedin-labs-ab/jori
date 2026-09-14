/**
 * What the development server is doing, from facts anyone can gather:
 * whether the port answers, whether the record `dev:up` wrote still names
 * a live process, and when the inputs the server loads once were last
 * written. Vite reloads edits on its own but keeps the import paths it has
 * resolved, so a file that moved or vanished leaves a running server
 * behind, as do dependencies and the env file.
 */
export type Facts = {
  answering: boolean
  alive: boolean
  startedAt?: number
  lockModified?: number
  modulesModified?: number
  envModified?: number
  sourcesMoved?: boolean
}

export type State =
  | { kind: "up" }
  | { kind: "down" }
  | { kind: "foreign" }
  | { kind: "stale"; reasons: string[] }

export function stateOf(facts: Facts): State {
  if (!facts.answering) {
    return { kind: "down" }
  }
  if (!facts.alive || facts.startedAt === undefined) {
    return { kind: "foreign" }
  }

  const reasons = staleReasons(facts, facts.startedAt)

  return reasons.length > 0 ? { kind: "stale", reasons } : { kind: "up" }
}

/** Installed modules older than the lockfile means a landing brought a
 *  package the checkout has not installed yet. */
export function needsInstall(facts: Facts) {
  return (
    facts.lockModified !== undefined &&
    (facts.modulesModified === undefined ||
      facts.lockModified > facts.modulesModified)
  )
}

function staleReasons(facts: Facts, startedAt: number) {
  const reasons: string[] = []

  if (needsInstall(facts)) {
    reasons.push("dependencies changed and are not installed")
  } else if (
    facts.modulesModified !== undefined &&
    facts.modulesModified > startedAt
  ) {
    reasons.push("dependencies were installed after it started")
  }
  if (facts.envModified !== undefined && facts.envModified > startedAt) {
    reasons.push(".env.local changed after it started")
  }
  if (facts.sourcesMoved) {
    reasons.push(
      "files moved or vanished since it started, which Vite cannot follow"
    )
  }

  return reasons
}
