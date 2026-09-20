import { Search } from "lucide-react"
import { type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { ShortcutButton } from "@/shared/shortcuts/button"
import { searchKeys } from "./bindings"

/** An icon button that opens search; hidden in the rail, where the
 *  organization's own square is all the header has room for. It sits in a
 *  row, so its tooltip opens below it, clear of the button beside it. */
export function SearchTrigger({
  className,
  ...props
}: Pick<ComponentProps<typeof ShortcutButton>, "className" | "onClick">) {
  return (
    <ShortcutButton
      className={cn(
        "size-8 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden",
        className
      )}
      keys={searchKeys}
      label="Search workspace"
      side="bottom"
      tooltip="Search"
      {...props}
    >
      <Search />
    </ShortcutButton>
  )
}
