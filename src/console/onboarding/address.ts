import { useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

/** Where an organization is set up, once it exists. Before that the flow is
 *  at /new, naming it. */
export const onboardingPath = "/onboarding"

/** Puts the address where the flow is: naming a new organization, or
 *  setting up the one it is about. Onboarding is drawn in place of the page
 *  whatever the address, so this moves nothing on screen. The address is
 *  set as the flow opens and as its organization comes into being, never
 *  held, so the flow leaves for the console like any other page. */
export function useOnboardingAddress(organizationId: string | undefined) {
  const navigate = useNavigate()
  const to = organizationId === undefined ? "/new" : onboardingPath

  useEffect(() => {
    if (window.location.pathname.replace(/\/$/, "") !== to) {
      void navigate({ replace: true, to })
    }
  }, [navigate, to])
}
