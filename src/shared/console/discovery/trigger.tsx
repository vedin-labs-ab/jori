import { Search } from "lucide-react"
import { type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { searchShortcut } from "./shortcut"

// The way into search: the icon beside the organization at the head of
// the sidebar; the shortcut lives in ./shortcut.

/** An icon button that opens search; hidden in the rail, where the
 *  organization's own square is all the header has room for. */
export function SearchTrigger({
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "children" | "size" | "variant">) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-keyshortcuts="Control+K Meta+K"
          aria-label="Search workspace"
          className={cn(
            "shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden",
            className
          )}
          size="icon-lg"
          variant="ghost"
          {...props}
        >
          <Search />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-1.5" side="right">
        Search
        <Kbd>{searchShortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
