import { ChevronDown } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useStoredOpen } from "@/shared/storage"

/** The control a group's label is: a ghost pill that grows on hover
 *  around text resting exactly where a plain label's would. Constant
 *  geometry — the pill's room comes from padding cancelled by negative
 *  margin — so the text never moves and a shell remount mid-hover has
 *  nothing to replay. */
export const groupLabelButton =
  "-mx-1.5 h-6 px-1.5 font-normal text-sidebar-foreground/70 text-xs"

/** A sidebar group the person can close for the room, and that stays
 *  closed between visits: its label toggles it, with a chevron that
 *  appears beside the label under the pointer. The icon rail always
 *  shows the group's items, since the label is not there to open it. */
export function CollapsibleGroup({
  children,
  label,
  name,
}: {
  children: ReactNode
  label: string
  /** The group's key in storage. */
  name: string
}) {
  const [open, setOpen] = useStoredOpen(`jori.sidebar.${name}`)
  const { state } = useSidebar()

  return (
    <Collapsible
      asChild
      onOpenChange={setOpen}
      open={open || state === "collapsed"}
    >
      <SidebarGroup>
        <SidebarGroupLabel>
          <CollapsibleTrigger asChild>
            {/* The trigger reads as expanded while the group is open, and
                a ghost button wears its open look for that; the label is
                a label, so at rest it shows nothing either way. */}
            <Button
              className={cn(
                groupLabelButton,
                "group/label aria-expanded:bg-transparent aria-expanded:text-sidebar-foreground/70 aria-expanded:hover:bg-muted aria-expanded:hover:text-foreground"
              )}
              variant="ghost"
            >
              {label}
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-3! opacity-0 transition-opacity group-focus-visible/label:opacity-100 group-hover/label:opacity-100",
                  open && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent asChild>
          <SidebarGroupContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {children}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
