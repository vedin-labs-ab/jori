import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useAction, useMutation, useQuery } from "convex/react"
import { ChangeOrganizationLogo } from "@/components/auth/organization/change-organization-logo"
import { UserInvitations } from "@/components/auth/organization/user-invitations"
import { UserButton } from "@/components/auth/user/user-button"
import { showErrorToast } from "@/shared/console/error"
import {
  activateOrganization,
  authClient,
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

/** Onboarding bound to the session and Convex: for the organization named,
 *  which has not been through it, or with none named, for one about to be
 *  created. */
export function Onboarding({ organizationId }: { organizationId?: string }) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const navigate = useNavigate()
  const session = useSession()
  const active = useActiveOrganization()
  const organizations = useListOrganizations()
  const { discovery, profile, ...actions } = useOnboarding(organizationId)
  const others = (organizations.data ?? []).filter(
    (organization) => organization.id !== organizationId
  )
  const alone = others.length === 0
  const organization =
    organizationId === undefined ? undefined : active.data?.name
  const loading =
    organizationId !== undefined &&
    (discovery === undefined || profile === undefined)

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
        switcher={
          alone ? undefined : (
            <SidebarOrganizationSwitcher
              onboarding={organizationId === undefined ? "new" : "current"}
            />
          )
        }
      >
        {loading ? null : (
          <OnboardingFlow
            discovery={discovery ?? null}
            invitations={alone ? <UserInvitations /> : undefined}
            logo={<ChangeOrganizationLogo />}
            name={session.data?.user.name.trim().split(/\s+/)[0] || undefined}
            onCancel={alone ? undefined : () => void navigate({ to: "/chat" })}
            onCreate={createOrganization}
            onDeclareTimezone={actions.declareTimezone}
            onDiscover={actions.discover}
            onFinish={(destination) => void actions.finish(destination)}
            organization={organization}
            timezone={profile?.declared?.timezone}
          />
        )}
      </OnboardingFrame>
    </>
  )
}

/** What onboarding reads and writes for its organization. Only the name
 *  step runs without one, and it asks for none of this. */
function useOnboarding(organizationId: string | undefined) {
  const scope = organizationId === undefined ? "skip" : { organizationId }
  const discover = useAction(api.organization.onboarding.discover)
  const complete = useAction(api.organization.onboarding.complete)
  const declareTimezone = useMutation(api.organization.profile.declareTimezone)
  const navigate = useNavigate()
  const active = useActiveOrganization()

  const onboarded = () => {
    if (organizationId === undefined) {
      throw new Error("No organization is being onboarded.")
    }

    return organizationId
  }

  return {
    discovery: useQuery(api.organization.discovery.get, scope),
    profile: useQuery(api.organization.profile.get, scope),
    finish: async (destination: "/chat" | "/context" = "/chat") => {
      try {
        await complete({ organizationId: onboarded() })
        await navigate({ to: destination })
        // The console opens once the organization reads as onboarded.
        await active.refetch()
      } catch (caught) {
        showErrorToast(caught, "Couldn't finish setting up. Try again.")
      }
    },
    declareTimezone: async (timezone: string) => {
      await declareTimezone({ organizationId: onboarded(), timezone })
    },
    discover: async (website: string) => {
      await discover({ organizationId: onboarded(), website })
    },
  }
}

/** Creates the organization and opens it. Opening starts the session's
 *  connection over, which remounts onboarding on the new organization's
 *  next step. */
async function createOrganization(name: string) {
  // Better Auth requires a unique slug; Jori never shows one, so it is
  // generated rather than asked for.
  const { data, error } = await authClient.organization.create({
    name,
    slug: crypto.randomUUID(),
  })

  if (!data) {
    throw new Error(error?.message ?? "Couldn't create the organization.")
  }

  await activateOrganization(data.id)
}
