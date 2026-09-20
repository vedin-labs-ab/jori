import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useAction, useMutation, useQuery } from "convex/react"
import { type ReactNode, useRef } from "react"
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
 *  created. It is one mounted thing from the first step to the last: naming
 *  the organization creates and activates it in place, and the same flow
 *  carries on about it. */
export function Onboarding({
  isPrepared,
  organizationId,
}: {
  /** Whether the member has been prepared in the organization, which its
   *  queries wait for. */
  isPrepared: boolean
  organizationId?: string
}) {
  const navigate = useNavigate()
  const session = useSession()
  const active = useActiveOrganization()
  const organizations = useListOrganizations()
  const { discovery, profile, ...actions } = useOnboarding(
    isPrepared ? organizationId : undefined
  )
  const alone =
    (organizations.data ?? []).filter(({ id }) => id !== organizationId)
      .length === 0
  // A flow that opens on an existing organization waits to know where that
  // one stands; one already under way is never taken off the screen.
  const started = useRef(false)
  started.current ||=
    organizationId === undefined ||
    (discovery !== undefined && profile !== undefined)

  return (
    <OnboardingChrome alone={alone} fresh={organizationId === undefined}>
      {started.current ? (
        <OnboardingFlow
          discovery={discovery ?? null}
          invitations={alone ? <UserInvitations /> : undefined}
          logo={<ChangeOrganizationLogo />}
          name={session.data?.user.name.trim().split(/\s+/)[0] || undefined}
          onApprove={actions.approve}
          onCancel={alone ? undefined : () => void navigate({ to: "/chat" })}
          onCreate={createOrganization}
          onDeclareTimezone={actions.declareTimezone}
          onDiscover={actions.discover}
          onFinish={actions.finish}
          organization={
            organizationId === undefined ? undefined : active.data?.name
          }
          proposal={profile?.proposed}
          timezone={profile?.declared?.timezone}
        />
      ) : null}
    </OnboardingChrome>
  )
}

/** The frame with the session's own account and switcher in it. */
function OnboardingChrome({
  alone,
  children,
  fresh,
}: {
  alone: boolean
  children: ReactNode
  fresh: boolean
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

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
        fresh={fresh}
        pathname={pathname}
        switcher={
          alone ? undefined : (
            <SidebarOrganizationSwitcher
              onboarding={fresh ? "new" : "current"}
            />
          )
        }
      >
        {children}
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
  const approve = useMutation(api.organization.profile.approve)
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
    approve: async (edits: { name: string; summary: string }) => {
      await approve({ organizationId: onboarded(), edits })
    },
    declareTimezone: async (timezone: string) => {
      await declareTimezone({ organizationId: onboarded(), timezone })
    },
    discover: async (website: string) => {
      await discover({ organizationId: onboarded(), website })
    },
    /** Marks the organization onboarded and leaves for the console. The
     *  page is changed first and the organization read again after, so the
     *  closing step stays up until the console takes its place, once. */
    finish: async (destination: "/chat" | "/integrations" = "/chat") => {
      try {
        await complete({ organizationId: onboarded() })
        await navigate({ to: destination })
        await active.refetch()
      } catch (caught) {
        showErrorToast(caught, "Couldn't finish setting up. Try again.")
      }
    },
  }
}

/** Creates the organization and activates it in place: onboarding stays on
 *  screen and has nothing scoped to the organization it came from. */
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

  await activateOrganization(data.id, { inPlace: true })
}
