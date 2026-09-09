import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { ConsoleLink } from "@/shared/console/shell/link"

export function WorkspaceNotFound() {
  return (
    <ConsolePageLayout>
      <ConsoleEmptyState
        action={
          <Button asChild variant="outline">
            <ConsoleLink to="/chat">New chat</ConsoleLink>
          </Button>
        }
        description="The link may be out of date, or the page may have moved."
        icon={SearchX}
        title="Page not found"
      />
    </ConsolePageLayout>
  )
}
