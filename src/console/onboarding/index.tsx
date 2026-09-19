import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useAction, useQuery } from "convex/react"
import { UserButton } from "@/components/auth/user/user-button"
import { showErrorToast } from "@/shared/console/error"
import {
  useActiveOrganization,
  useListOrganizations,
  useSession,
} from "@/shared/session/auth"
import { mainContentId, SkipToContent } from "@/shared/skip"
import { api } from "../../../convex/_generated/api"
import { SidebarUserButton } from "../shell/account"
import { SidebarOrganizationSwitcher } from "../shell/organization"
import { OnboardingFlow } from "./flow"
import { OnboardingFrame } from "./frame"

/** Onboarding bound to the session and Convex, for an organization that has
 *  not been through it. */
export function Onboarding({ organizationId }: { organizationId: string }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const navigate = useNavigate()
  const session = useSession()
  const active = useActiveOrganization()
  const organizations = useListOrganizations()
  const discovery = useQuery(api.organization.discovery.get, { organizationId })
  const discover = useAction(api.organization.onboarding.discover)
  const complete = useAction(api.organization.onboarding.complete)
  const alone = (organizations.data?.length ?? 0) <= 1
  const organization = active.data?.name ?? "your organization"

  const finish = async (destination?: "/context") => {
    try {
      await complete({ organizationId })

      if (destination !== undefined) {
        await navigate({ to: destination })
      }

      // The console opens once the organization reads as onboarded.
      await active.refetch()
    } catch (caught) {
      showErrorToast(caught, "Couldn't finish setting up. Try again.")
    }
  }

  return (
    <>
      <SkipToContent />
      <OnboardingFrame
        account={
          alone ? (
            <UserButton hideSettings size="icon" />
          ) : (
            <SidebarUserButton />
          )
        }
        contentId={mainContentId}
        organization={organization}
        pathname={pathname}
        switcher={alone ? undefined : <SidebarOrganizationSwitcher />}
      >
        {discovery === undefined ? null : (
          <OnboardingFlow
            discovery={discovery}
            name={session.data?.user.name.trim().split(/\s+/)[0] || undefined}
            onDiscover={async (website) => {
              await discover({ organizationId, website })
            }}
            onFinish={(destination) => void finish(destination)}
            organization={organization}
          />
        )}
      </OnboardingFrame>
    </>
  )
}
