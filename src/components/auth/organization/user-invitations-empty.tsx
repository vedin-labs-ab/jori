import { useAuthPlugin } from "@better-auth-ui/react"
import { Send } from "lucide-react"

import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * Empty state for `UserInvitations`.
 *
 * Built from the same primitives as every other empty surface rather than a
 * bespoke circle-in-a-card, so the first screen a new account sees does not
 * teach an empty-state language the console then contradicts.
 */
export function UserInvitationsEmpty() {
  const { localization: organizationLocalization } =
    useAuthPlugin(organizationPlugin)

  return (
    <Empty className="min-h-40 rounded-md">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Send />
        </EmptyMedia>
        <EmptyTitle>{organizationLocalization.noInvitations}</EmptyTitle>
        <EmptyDescription>
          {organizationLocalization.userInvitationsEmptyDescription}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
