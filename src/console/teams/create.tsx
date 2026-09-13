import {
  type OrganizationAuthClient,
  useHasPermission,
} from "@better-auth-ui/react"
import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/shared/session/auth"
import { TeamNameDialog } from "./name"

/** Header action for the Teams tab. Only shown to people the server would
 *  let create a team — owners and admins under the default role statements. */
export function TeamCreateButton() {
  const { data: permission } = useHasPermission(
    authClient as OrganizationAuthClient,
    { permissions: { team: ["create"] } }
  )
  const [open, setOpen] = useState(false)

  if (!permission?.success) {
    return null
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" type="button">
        <Plus />
        Create team
      </Button>
      <TeamNameDialog onOpenChange={setOpen} open={open} />
    </>
  )
}
