import { type ReactNode, useEffect, useState } from "react"
import { storedSidebarOpen } from "@/components/ui/sidebar"
import { ConsoleFrame } from "@/shared/console/shell/frame"
import { ConsoleSidebarShell } from "@/shared/console/shell/navigation"

/** The console around onboarding: the main view with no header, since there
 *  is no page to name and nowhere to navigate. With no other organization to
 *  go to it stands alone, the account in its corner. With others, the
 *  sidebar stays for its switcher and account and carries nothing else, so
 *  the one way out of onboarding is another organization. */
export function OnboardingFrame({
  account,
  children,
  contentId,
  fresh,
  pathname,
  switcher,
}: {
  account: ReactNode
  children: ReactNode
  contentId?: string
  /** Whether the organization is yet to be created. */
  fresh: boolean
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
    () => fresh && (storedSidebarOpen() ?? true)
  )

  useEffect(() => setSidebarOpen(false), [])

  return (
    <ConsoleFrame
      card={alone}
      contentId={contentId}
      header={false}
      onSidebarOpenChange={setSidebarOpen}
      pathname={pathname}
      sidebarOpen={sidebarOpen}
      sidebar={
        alone ? undefined : (
          <ConsoleSidebarShell account={account} organization={switcher} />
        )
      }
    >
      {alone ? <div className="absolute top-3 right-3">{account}</div> : null}
      {children}
    </ConsoleFrame>
  )
}
