import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConsoleLink } from "../../shell/link"
import { type ReferenceTarget } from "../types"
import { chatDestination } from "./context"

/** The way from a resource's page into a chat about it: a header action
 *  beside the page's own, linking to a new chat that carries the resource
 *  as its context. Icon and label on wide screens, the icon alone on
 *  small ones, the way ConsoleHeaderButton reads. */
export function AskJoriAction({ target }: { target: ReferenceTarget }) {
  return (
    <Button asChild className="max-sm:size-7 max-sm:px-0" variant="outline">
      <ConsoleLink aria-label="Ask Jori" {...chatDestination(target)}>
        <MessageSquare />
        <span className="max-sm:hidden">Ask Jori</span>
      </ConsoleLink>
    </Button>
  )
}
