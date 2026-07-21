"use client"

import { useAuth } from "@better-auth-ui/react"
import { SectionGroup } from "@/components/ui/section"
import { ActiveSessions } from "./active-sessions"
import { ChangePassword } from "./change-password"

export type SecuritySettingsProps = {
  className?: string
}

/**
 * Renders password management, active sessions, and plugin security cards.
 *
 * Each registered auth plugin may contribute `securityCards` (for example passkeys, delete-user).
 *
 * @param className - Optional additional CSS class names for the outer container.
 * @returns The security settings container as a JSX element.
 */
export function SecuritySettings({ className }: SecuritySettingsProps) {
  const { emailAndPassword, plugins } = useAuth()

  return (
    <SectionGroup className={className}>
      {emailAndPassword?.enabled && <ChangePassword />}
      <ActiveSessions />
      {plugins.flatMap(
        (plugin) =>
          plugin.securityCards?.map((Card, index) => (
            <Card key={`${plugin.id}-${index.toString()}`} />
          )) ?? []
      )}
    </SectionGroup>
  )
}
