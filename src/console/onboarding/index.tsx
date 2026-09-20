import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useAction, useMutation, useQuery } from "convex/react"
import { type ReactNode, useRef, useState } from "react"
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
import { usePlanCheckout } from "../billing/actions"
import { SidebarUserButton } from "../shell/account"
import { SidebarOrganizationSwitcher } from "../shell/organization"
import { onboardingPath, useOnboardingAddress } from "./address"
import { planOf, useCheckoutReturn } from "./checkout"
import { OnboardingFlow } from "./flow"
import { OnboardingFrame } from "./frame"

/** Onboarding bound to the session and Convex: for the organization named,
 *  which has not been through it, or with none named, for one about to be
 *  created.
 *
 *  A flow is about one organization. It stays mounted while the one it
 *  creates comes into being, naming it, activating it in place, and
 *  carrying on about it; pointed at any other organization, it starts over
 *  from where that one stands. */
export function Onboarding({
  isPrepared,
  organizationId,
}: {
  /** Whether the member has been prepared in the organization, which its
   *  queries wait for. */
  isPrepared: boolean
  organizationId?: string
}) {
  const organizations = useListOrganizations()
  const [created, setCreated] = useState<string>()
  const alone =
    (organizations.data ?? []).filter(({ id }) => id !== organizationId)
      .length === 0
  const isOwn = organizationId === undefined || organizationId === created

  return (
    <OnboardingChrome alone={alone} fresh={organizationId === undefined}>
      <OnboardingSession
        alone={alone}
        key={isOwn ? "own" : organizationId}
        onCreate={async (name) => {
          const id = await createOrganization(name)

          // Known before it is active, so the flow is still this one when
          // the organization reads as the active one.
          setCreated(id)
          await activateOrganization(id)
        }}
        isPrepared={isPrepared}
        organizationId={organizationId}
      />
    </OnboardingChrome>
  )
}

/** One flow, with what it reads and writes for its organization. */
function OnboardingSession({
  alone,
  isPrepared,
  onCreate,
  organizationId,
}: {
  alone: boolean
  isPrepared: boolean
  onCreate: (name: string) => Promise<void>
  organizationId: string | undefined
}) {
  const navigate = useNavigate()
  const session = useSession()
  const active = useActiveOrganization()
  const { billing, discovery, profile, ...actions } = useOnboarding(
    isPrepared ? organizationId : undefined
  )
  useOnboardingAddress(organizationId)
  const checkout = useCheckoutReturn()
  // A flow that opens on an existing organization waits to know where that
  // one stands; one already under way is never taken off the screen.
  const started = useRef(organizationId === undefined)
  started.current ||=
    billing !== undefined && discovery !== undefined && profile !== undefined

  if (!started.current) {
    return null
  }

  return (
    <OnboardingFlow
      discovery={discovery ?? null}
      invitations={alone ? <UserInvitations /> : undefined}
      logo={<ChangeOrganizationLogo />}
      name={session.data?.user.name.trim().split(/\s+/)[0] || undefined}
      onApprove={actions.approve}
      onCancel={alone ? undefined : () => void navigate({ to: "/chat" })}
      onCreate={onCreate}
      onDeclareTimezone={actions.declareTimezone}
      onDiscover={actions.discover}
      onFinish={actions.finish}
      onSubscribe={actions.subscribe}
      organization={
        organizationId === undefined ? undefined : active.data?.name
      }
      plan={planOf(billing, checkout === "subscribed")}
      proposal={profile?.proposed}
      returned={checkout !== undefined}
      timezone={profile?.declared?.timezone}
    />
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
  const startPlanCheckout = usePlanCheckout()
  const navigate = useNavigate()
  const active = useActiveOrganization()
  const onboarded = () => {
    if (organizationId === undefined) {
      throw new Error("No organization is being onboarded.")
    }

    return organizationId
  }

  return {
    billing: useQuery(api.billing.console.overview, scope),
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
    subscribe: async () => {
      const { url } = await startPlanCheckout(
        onboarded(),
        new URL(onboardingPath, window.location.origin).toString()
      )

      window.location.assign(url)
    },
    /** Marks the organization onboarded and leaves for the console. The
     *  page is changed first and the organization read again after, so the
     *  closing step stays up until the console takes its place, once. */
    finish: async (destination: "/chat" | "/integrations" = "/chat") => {
      try {
        await complete({ organizationId: onboarded() })
        await navigate({ replace: true, to: destination })
        await active.refetch()
      } catch (caught) {
        showErrorToast(caught, "Couldn't finish setting up. Try again.")
      }
    },
  }
}

/** Creates the organization, answering with its id. */
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

  return data.id
}
