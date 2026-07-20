import { useState } from "react"
import { authClient } from "@/shared/session/auth"
import { OnboardingModal } from "./modal"

// Shows the one-time welcome flow on console load when the active organization
// has not been onboarded yet. Completing or dismissing it persists a flag in
// the organization's metadata so it never reopens.
export function OnboardingGate() {
  const { data: organization } = authClient.useActiveOrganization()
  const [dismissed, setDismissed] = useState(false)

  if (organization === null || organization === undefined) {
    return null
  }

  if (dismissed || readOnboarded(organization.metadata)) {
    return null
  }

  const handleClose = () => {
    setDismissed(true)
    // Re-activating the same organization refreshes the cached organization,
    // so the persisted onboarded flag survives route remounts.
    void authClient.organization
      .setActive({ organizationId: organization.id })
      .catch(() => undefined)
  }

  return (
    <OnboardingModal organizationId={organization.id} onClose={handleClose} />
  )
}

// Better Auth stores organization metadata as JSON; depending on the read
// path it surfaces parsed or as the raw string.
function readOnboarded(metadata: unknown): boolean {
  const record = typeof metadata === "string" ? parseJson(metadata) : metadata

  if (typeof record !== "object" || record === null) {
    return false
  }

  return (record as { onboarded?: unknown }).onboarded === true
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
