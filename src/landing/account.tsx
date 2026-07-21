import { UserButton } from "@/components/auth/user/user-button"
import { SessionProviders } from "@/shared/session"

export function LandingAccount() {
  return (
    <SessionProviders>
      <UserButton hideSettings size="icon" />
    </SessionProviders>
  )
}
