import { type ReactNode, useEffect, useState } from "react"
import { storedSidebarOpen } from "@/components/ui/sidebar"
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
  /** The organization being set up, by name, once it exists. */
  organization: string | undefined
  pathname: string
  /** The organization switcher, when there is another organization. */
  switcher?: ReactNode
}) {
  const alone = switcher === undefined
  // A sidebar that holds only the switcher has nothing to show open. A new
  // organization starts from the console, so the sidebar arrives as the
  // person left it and folds from there; after that it starts folded. The
  // state is the frame's own, so the person's preference is left alone.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => organization === undefined && (storedSidebarOpen() ?? true)
  )

  useEffect(() => setSidebarOpen(false), [])

  return (
    <ConsoleFrame
      card={alone}
      contentId={contentId}
      onSidebarOpenChange={setSidebarOpen}
      pathname={pathname}
      sidebarOpen={sidebarOpen}
      sidebar={
        alone ? undefined : (
          <ConsoleSidebarShell account={account} organization={switcher} />
        )
      }
      title={
        organization === undefined
          ? "New organization"
          : `Set up ${organization}`
      }
    >
      {alone ? <ConsoleHeaderActions>{account}</ConsoleHeaderActions> : null}
      {children}
    </ConsoleFrame>
  )
}
