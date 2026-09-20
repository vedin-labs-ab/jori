import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"

/** Where an organization is set up, once it exists. Before that the flow is
 *  at /new, naming it. */
export const onboardingPath = "/onboarding"

/** Keeps the address saying what the flow is doing: naming a new
 *  organization, or setting up the one it is about. Onboarding is drawn in
 *  place of the page whatever the address, so following it moves nothing on
 *  screen. It stops following once the flow is leaving for the console. */
export function useOnboardingAddress(
  organizationId: string | undefined,
  isLeaving: boolean
) {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname.replace(/\/$/, ""),
  })
  const to = organizationId === undefined ? "/new" : onboardingPath

  useEffect(() => {
    if (!isLeaving && pathname !== to) {
      void navigate({ replace: true, to })
    }
  }, [isLeaving, navigate, pathname, to])
}
