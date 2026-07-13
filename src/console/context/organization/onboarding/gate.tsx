import { useOrganization } from "@clerk/tanstack-react-start"
import { useState } from "react"
import { OnboardingModal } from "./modal"

// Shows the one-time welcome flow on console load when the active organization
// has not been onboarded yet. Completing or dismissing it persists a flag in
// Clerk so it never reopens.
export function OnboardingGate() {
  const { organization } = useOrganization()
  const [dismissed, setDismissed] = useState(false)

  if (organization === null || organization === undefined) {
    return null
  }

  if (dismissed || organization.publicMetadata?.onboarded === true) {
    return null
  }

  const handleClose = () => {
    setDismissed(true)
    void organization.reload().catch(() => undefined)
  }

  return <OnboardingModal tenantId={organization.id} onClose={handleClose} />
}
