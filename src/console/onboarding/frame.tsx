import { type ReactNode } from "react"
import { ConsoleHeaderActions } from "@/shared/console/layout"
import { ConsoleFrame } from "@/shared/console/shell/frame"
import { ConsoleSidebarShell } from "@/shared/console/shell/navigation"

/** The console around onboarding. With no other organization to go to, the
 *  main view stands alone and the account sits in its header. With others,
 *  the sidebar stays for its switcher and account and carries nothing else,
 *  so the one way out of onboarding is another organization. */
export function OnboardingFrame({
  account,
  children,
  contentId,
  organization,
  pathname,
  switcher,
}: {
  account: ReactNode
  children: ReactNode
  contentId?: string
  /** The organization being set up, by name. */
  organization: string
  pathname: string
  /** The organization switcher, when there is another organization. */
  switcher?: ReactNode
}) {
  const alone = switcher === undefined

  return (
    <ConsoleFrame
      card={alone}
      contentId={contentId}
      pathname={pathname}
      sidebar={
        alone ? undefined : (
          <ConsoleSidebarShell account={account} organization={switcher} />
        )
      }
      title={`Set up ${organization}`}
    >
      {alone ? <ConsoleHeaderActions>{account}</ConsoleHeaderActions> : null}
      {children}
    </ConsoleFrame>
  )
}
